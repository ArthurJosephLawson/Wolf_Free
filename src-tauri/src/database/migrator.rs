use std::path::Path;

use rusqlite::Connection;

use crate::error::{WolfError, WolfResult};

const MIGRATIONS: &[(&str, &str)] = &[
    ("0001_init", include_str!("../../migrations/0001_init.sql")),
    (
        "0002_settings",
        include_str!("../../migrations/0002_settings.sql"),
    ),
    (
        "0003_productivity",
        include_str!("../../migrations/0003_productivity.sql"),
    ),
    (
        "0004_commit_provenance",
        include_str!("../../migrations/0004_commit_provenance.sql"),
    ),
    (
        "0005_recurrence",
        include_str!("../../migrations/0005_recurrence.sql"),
    ),
    (
        "0006_countdown_xp",
        include_str!("../../migrations/0006_countdown_xp.sql"),
    ),
];

pub fn ensure_migration_table(conn: &Connection) -> WolfResult<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            name       TEXT PRIMARY KEY NOT NULL,
            applied_at TEXT NOT NULL
         );",
    )?;
    Ok(())
}

pub fn migrate(conn: &Connection) -> WolfResult<usize> {
    ensure_migration_table(conn)?;

    let already: Vec<String> = {
        let mut stmt = conn.prepare("SELECT name FROM schema_migrations")?;
        let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
        rows.collect::<Result<Vec<_>, _>>()?
    };

    let mut applied = 0usize;
    for (name, sql) in MIGRATIONS {
        if already.iter().any(|n| n == name) {
            continue;
        }

        let tx = conn.unchecked_transaction()?;
        tx.execute_batch(sql)?;
        tx.execute(
            "INSERT INTO schema_migrations (name, applied_at) VALUES (?1, ?2)",
            rusqlite::params![name, crate::models::now_iso()],
        )?;
        tx.commit()?;
        applied += 1;
        log::info!("applied migration {name}");
    }

    Ok(applied)
}

pub fn open_database(path: &Path) -> WolfResult<Connection> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| {
            WolfError::internal(format!(
                "Could not create the Wolf data folder {}: {e}",
                parent.display()
            ))
        })?;
    }

    let conn = Connection::open(path)?;
    conn.busy_timeout(std::time::Duration::from_secs(5))?;
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;
         PRAGMA foreign_keys = ON;
         PRAGMA temp_store = MEMORY;",
    )?;
    Ok(conn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::test_support::test_db;

    #[test]
    fn every_migration_applies_once_and_then_does_nothing() {
        let conn = Connection::open_in_memory().expect("in-memory database");

        assert_eq!(migrate(&conn).unwrap(), MIGRATIONS.len());
        assert_eq!(migrate(&conn).unwrap(), 0);
    }

    #[test]
    fn each_migration_is_recorded_by_name() {
        let conn = Connection::open_in_memory().expect("in-memory database");
        migrate(&conn).unwrap();

        let mut stmt = conn
            .prepare("SELECT name FROM schema_migrations ORDER BY name")
            .unwrap();
        let names = stmt
            .query_map([], |r| r.get::<_, String>(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();

        assert_eq!(
            names,
            vec![
                "0001_init",
                "0002_settings",
                "0003_productivity",
                "0004_commit_provenance",
                "0005_recurrence",
                "0006_countdown_xp"
            ]
        );
    }

    #[test]
    fn commit_logs_can_be_tagged_to_a_git_sha_once() {
        let db = test_db();

        db.with_conn(|conn| {
            conn.execute(
                "INSERT INTO commit_logs
                   (id, committed_on, message, files_changed, lines_added, lines_removed, created_at, source, git_sha)
                 VALUES ('a', '2026-10-05', 'feat: a', 1, 2, 3, 'now', 'git', 'abc123')",
                [],
            )?;
            let second = conn.execute(
                "INSERT INTO commit_logs
                   (id, committed_on, message, files_changed, lines_added, lines_removed, created_at, source, git_sha)
                 VALUES ('b', '2026-10-05', 'feat: a again', 1, 2, 3, 'now', 'git', 'abc123')",
                [],
            );
            assert!(
                second.is_err(),
                "the unique index on git_sha should reject a second row"
            );

            let nulls = conn.execute(
                "INSERT INTO commit_logs
                   (id, committed_on, message, files_changed, lines_added, lines_removed, created_at, source, git_sha)
                 VALUES ('c', '2026-10-05', 'manual', 1, 2, 3, 'now', 'manual', NULL)",
                [],
            );
            assert!(
                nulls.is_ok(),
                "manual rows have no sha and are not covered by the index"
            );
            Ok(())
        })
        .unwrap();
    }

    #[test]
    fn the_productivity_tables_exist_after_migrating() {
        let db = test_db();

        for table in ["xp_events", "countdowns", "commit_logs"] {
            let count: i64 = db
                .with_conn(|conn| {
                    Ok(conn.query_row(
                        "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?1",
                        rusqlite::params![table],
                        |r| r.get(0),
                    )?)
                })
                .unwrap();
            assert_eq!(count, 1, "{table} should exist");
        }
    }

    #[test]
    fn xp_events_reject_a_second_award_for_the_same_source() {
        let db = test_db();

        db.with_conn(|conn| {
            conn.execute(
                "INSERT INTO xp_events (id, source_kind, source_id, amount, awarded_at, day)
                 VALUES ('a', 'task', 'task-1', 10, 'now', '2026-10-05')",
                [],
            )?;
            let second = conn.execute(
                "INSERT INTO xp_events (id, source_kind, source_id, amount, awarded_at, day)
                 VALUES ('b', 'task', 'task-1', 10, 'now', '2026-10-05')",
                [],
            );
            assert!(
                second.is_err(),
                "the UNIQUE(source_kind, source_id) constraint should reject this"
            );
            Ok(())
        })
        .unwrap();
    }

    #[test]
    fn xp_events_reject_a_non_positive_amount_or_an_unknown_source() {
        let db = test_db();

        let zero = db.with_conn(|conn| {
            let rejected = conn
                .execute(
                    "INSERT INTO xp_events (id, source_kind, source_id, amount, awarded_at, day)
                     VALUES ('a', 'task', 'task-1', 0, 'now', '2026-10-05')",
                    [],
                )
                .is_err();
            Ok(rejected)
        });
        assert!(zero.unwrap(), "a zero XP award should be rejected");

        let unknown = db.with_conn(|conn| {
            let rejected = conn
                .execute(
                    "INSERT INTO xp_events (id, source_kind, source_id, amount, awarded_at, day)
                     VALUES ('unknown-source', 'telepathy', 'task-1', 10, 'now', '2026-10-05')",
                    [],
                )
                .is_err();
            Ok(rejected)
        });
        assert!(
            unknown.unwrap(),
            "an unknown source_kind should be rejected"
        );
    }

    #[test]
    fn countdowns_reject_a_non_positive_target() {
        let db = test_db();

        let result = db.with_conn(|conn| {
            let rejected = conn
                .execute(
                    "INSERT INTO countdowns
                       (id, label, target_date, current_value, target_value, completed_at, created_at, updated_at)
                     VALUES ('c', 'Ship', '2026-11-01', 0, 0, NULL, 'now', 'now')",
                    [],
                )
                .is_err();
            Ok(rejected)
        });
        assert!(result.unwrap(), "a zero target_value should be rejected");

        let negative_progress = db.with_conn(|conn| {
            let rejected = conn
                .execute(
                    "INSERT INTO countdowns
                       (id, label, target_date, current_value, target_value, completed_at, created_at, updated_at)
                     VALUES ('d', 'Ship', '2026-11-01', -1, 1, NULL, 'now', 'now')",
                    [],
                )
                .is_err();
            Ok(rejected)
        });
        assert!(
            negative_progress.unwrap(),
            "a negative current_value should be rejected"
        );
    }

    #[test]
    fn commit_logs_reject_negative_counts_and_a_blank_message() {
        let db = test_db();

        let negative = db.with_conn(|conn| {
            let rejected = conn
                .execute(
                    "INSERT INTO commit_logs
                       (id, committed_on, message, files_changed, lines_added, lines_removed, created_at)
                     VALUES ('a', '2026-10-05', 'feat: x', -1, 0, 0, 'now')",
                    [],
                )
                .is_err();
            Ok(rejected)
        });
        assert!(
            negative.unwrap(),
            "a negative files_changed should be rejected"
        );

        let blank = db.with_conn(|conn| {
            let rejected = conn
                .execute(
                    "INSERT INTO commit_logs
                       (id, committed_on, message, files_changed, lines_added, lines_removed, created_at)
                     VALUES ('b', '2026-10-05', '   ', 1, 0, 0, 'now')",
                    [],
                )
                .is_err();
            Ok(rejected)
        });
        assert!(blank.unwrap(), "a blank commit message should be rejected");
    }

    #[test]
    fn the_recurrence_column_defaults_to_none_and_rejects_junk() {
        let db = test_db();

        db.with_conn(|conn| {
            conn.execute(
                "INSERT INTO calendar_events (id, title, start_time, end_time, created_at, updated_at)
                 VALUES ('e1', 'Standup', '2026-10-05T09:00:00', '2026-10-05T09:30:00', 'now', 'now')",
                [],
            )?;
            let recurrence: String = conn.query_row(
                "SELECT recurrence FROM calendar_events WHERE id = 'e1'",
                [],
                |r| r.get(0),
            )?;
            assert_eq!(recurrence, "none");

            let rejected = conn
                .execute(
                    "INSERT INTO calendar_events
                       (id, title, start_time, end_time, recurrence, created_at, updated_at)
                     VALUES ('e2', 'Bad', '2026-10-05T09:00:00', '2026-10-05T09:30:00', 'hourly', 'now', 'now')",
                    [],
                )
                .is_err();
            assert!(rejected, "an unknown recurrence rule should be rejected");
            Ok(())
        })
        .unwrap();
    }

    #[test]
    fn xp_events_accept_a_countdown_source_after_the_rebuild() {
        let db = test_db();

        db.with_conn(|conn| {
            conn.execute(
                "INSERT INTO xp_events (id, source_kind, source_id, amount, awarded_at, day)
                 VALUES ('x1', 'countdown', 'c1', 15, 'now', '2026-10-05')",
                [],
            )?;
            Ok(())
        })
        .unwrap();
    }
}
