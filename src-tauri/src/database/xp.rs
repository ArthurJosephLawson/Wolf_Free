use rusqlite::{params, OptionalExtension, Row};

use crate::database::Database;
use crate::error::{WolfError, WolfResult};
use crate::models::{level_for, xp_for_next_level, xp_into_level, XpEvent, XpSource, XpSummary};

const SELECT_COLUMNS: &str = "id, source_kind, source_id, amount, awarded_at, day";

fn map_row(row: &Row<'_>) -> rusqlite::Result<XpEvent> {
    Ok(XpEvent {
        id: row.get(0)?,
        source_kind: XpSource::parse(&row.get::<_, String>(1)?).map_err(|e| {
            rusqlite::Error::FromSqlConversionFailure(1, rusqlite::types::Type::Text, e.into())
        })?,
        source_id: row.get(2)?,
        amount: row.get(3)?,
        awarded_at: row.get(4)?,
        day: row.get(5)?,
    })
}

impl Database {
    pub fn xp_summary(&self, window_start: &str, window_end: &str) -> WolfResult<XpSummary> {
        if window_start > window_end {
            return Err(WolfError::invalid(
                "The XP window start must not be after its end.",
            ));
        }

        self.with_conn(|conn| {
            let total: i64 = conn.query_row(
                "SELECT COALESCE(SUM(amount), 0) FROM xp_events WHERE day BETWEEN ?1 AND ?2",
                params![window_start, window_end],
                |r| r.get(0),
            )?;

            let lifetime_total: i64 =
                conn.query_row("SELECT COALESCE(SUM(amount), 0) FROM xp_events", [], |r| {
                    r.get(0)
                })?;

            Ok(XpSummary {
                total,
                lifetime_total,
                level: level_for(lifetime_total),
                xp_into_level: xp_into_level(lifetime_total),
                xp_for_next_level: xp_for_next_level(lifetime_total),
            })
        })
    }

    pub fn xp_for_source(&self, source: XpSource, source_id: &str) -> WolfResult<Option<XpEvent>> {
        self.with_conn(|conn| {
            conn.query_row(
                &format!(
                    "SELECT {SELECT_COLUMNS} FROM xp_events
                     WHERE source_kind = ?1 AND source_id = ?2"
                ),
                params![source.as_str(), source_id],
                map_row,
            )
            .optional()
            .map_err(WolfError::from)
        })
    }

    #[cfg(test)]
    pub fn list_xp_events(&self, limit: u32) -> WolfResult<Vec<XpEvent>> {
        self.with_conn(|conn| {
            let mut stmt = conn.prepare(&format!(
                "SELECT {SELECT_COLUMNS} FROM xp_events ORDER BY awarded_at DESC LIMIT ?1"
            ))?;
            let rows = stmt.query_map(params![limit], map_row)?;
            rows.collect::<Result<Vec<_>, _>>().map_err(WolfError::from)
        })
    }

    #[cfg(test)]
    pub fn xp_total(&self) -> WolfResult<i64> {
        self.with_conn(|conn| {
            Ok(
                conn.query_row("SELECT COALESCE(SUM(amount), 0) FROM xp_events", [], |r| {
                    r.get(0)
                })?,
            )
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::test_support::test_db;
    use crate::models::new_id;

    fn insert_award(db: &Database, source: XpSource, source_id: &str, amount: i64, day: &str) {
        db.with_conn(|conn| {
            conn.execute(
                "INSERT INTO xp_events
                   (id, source_kind, source_id, amount, awarded_at, day)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![new_id(), source.as_str(), source_id, amount, day, day],
            )?;
            Ok(())
        })
        .unwrap();
    }

    #[test]
    fn the_window_total_ignores_days_outside_it() {
        let db = test_db();
        let today = crate::models::local_day();
        let old = shift_day(&today, -40);
        let recent = shift_day(&today, -2);

        insert_award(&db, XpSource::Task, "t-old", 100, &old);
        insert_award(&db, XpSource::Task, "t-recent", 10, &recent);
        insert_award(&db, XpSource::Task, "t-today", 5, &today);

        let summary = db.xp_summary(&shift_day(&today, -27), &today).unwrap();
        assert_eq!(summary.total, 15);
    }

    #[test]
    fn level_fields_ignore_the_window_and_read_the_whole_ledger() {
        let db = test_db();
        let today = crate::models::local_day();
        let old = shift_day(&today, -40);

        insert_award(&db, XpSource::Task, "t-old", 100, &old);
        insert_award(&db, XpSource::Task, "t-today", 600, &today);

        let summary = db.xp_summary(&today, &today).unwrap();

        assert_eq!(summary.total, 600);
        assert_eq!(summary.lifetime_total, 700);
        assert_eq!(summary.level, 4);
        assert_eq!(summary.xp_into_level, 100);
        assert_eq!(summary.xp_for_next_level, 300);
    }

    #[test]
    fn a_backwards_window_is_rejected() {
        let db = test_db();
        assert!(db.xp_summary("2026-10-05", "2026-10-01").is_err());
    }

    #[test]
    fn an_event_can_be_read_back_by_its_source() {
        let db = test_db();
        let today = crate::models::local_day();
        insert_award(&db, XpSource::Habit, "habit-1", 5, &today);
        let event = db.xp_for_source(XpSource::Habit, "habit-1").unwrap();
        assert_eq!(event.map(|e| e.amount), Some(5));
        assert!(db
            .xp_for_source(XpSource::Habit, "other")
            .unwrap()
            .is_none());
    }

    fn shift_day(day: &str, by: i64) -> String {
        let date = chrono::NaiveDate::parse_from_str(day, "%Y-%m-%d").unwrap();
        (date + chrono::Duration::days(by))
            .format("%Y-%m-%d")
            .to_string()
    }
}
