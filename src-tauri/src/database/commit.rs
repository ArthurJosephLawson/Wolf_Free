use rusqlite::{params, OptionalExtension, Row};

use crate::database::Database;
use crate::error::{WolfError, WolfResult};
use crate::gitlog::GitCommit;
use crate::models::{new_id, now_iso, CommitLog, NewCommitLog};

const SELECT_COLUMNS: &str =
    "id, committed_on, message, files_changed, lines_added, lines_removed, created_at";

fn map_row(row: &Row<'_>) -> rusqlite::Result<CommitLog> {
    Ok(CommitLog {
        id: row.get(0)?,
        committed_on: row.get(1)?,
        message: row.get(2)?,
        files_changed: row.get(3)?,
        lines_added: row.get(4)?,
        lines_removed: row.get(5)?,
        created_at: row.get(6)?,
    })
}

fn validate_day(value: &str) -> WolfResult<String> {
    let day = value.trim();
    chrono::NaiveDate::parse_from_str(day, "%Y-%m-%d")
        .map(|_| day.to_string())
        .map_err(|_| {
            WolfError::invalid(format!(
                "`{value}` is not a valid date (expected YYYY-MM-DD)."
            ))
        })
}

fn validate_message(raw: &str) -> WolfResult<String> {
    let message = raw.trim();
    if message.is_empty() {
        return Err(WolfError::invalid("A commit needs a message."));
    }
    if message.chars().count() > 200 {
        return Err(WolfError::invalid(
            "A commit message can be at most 200 characters.",
        ));
    }
    Ok(message.to_string())
}

fn validate_count(value: Option<i64>, field: &str) -> WolfResult<i64> {
    let value = value.unwrap_or(0);
    if value < 0 {
        return Err(WolfError::invalid(format!("{field} cannot be negative.")));
    }
    Ok(value)
}

fn fit_message(raw: &str) -> String {
    raw.trim().chars().take(200).collect()
}

struct GitRow {
    id: String,
    day: String,
    message: String,
    files_changed: i64,
    lines_added: i64,
    lines_removed: i64,
    created_at: String,
    sha: String,
}

impl Database {
    pub fn create_commit_log(&self, input: &NewCommitLog) -> WolfResult<CommitLog> {
        let committed_on = validate_day(&input.committed_on)?;
        let message = validate_message(&input.message)?;
        let files_changed = validate_count(input.files_changed, "Files changed")?;
        let lines_added = validate_count(input.lines_added, "Lines added")?;
        let lines_removed = validate_count(input.lines_removed, "Lines removed")?;

        let entry = CommitLog {
            id: new_id(),
            committed_on,
            message,
            files_changed,
            lines_added,
            lines_removed,
            created_at: now_iso(),
        };

        self.with_conn(|conn| {
            conn.execute(
                "INSERT INTO commit_logs
                   (id, committed_on, message, files_changed, lines_added, lines_removed, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    entry.id,
                    entry.committed_on,
                    entry.message,
                    entry.files_changed,
                    entry.lines_added,
                    entry.lines_removed,
                    entry.created_at
                ],
            )?;
            Ok(())
        })?;

        Ok(entry)
    }

    pub fn list_commit_logs(&self, limit: u32) -> WolfResult<Vec<CommitLog>> {
        self.with_conn(|conn| {
            let mut stmt = conn.prepare(&format!(
                "SELECT {SELECT_COLUMNS} FROM commit_logs
                 ORDER BY committed_on DESC, created_at DESC LIMIT ?1"
            ))?;
            let rows = stmt.query_map(params![limit], map_row)?;
            rows.collect::<Result<Vec<_>, _>>().map_err(WolfError::from)
        })
    }

    pub fn delete_commit_log(&self, id: &str) -> WolfResult<()> {
        self.with_conn(|conn| {
            let sha: Option<String> = conn
                .query_row(
                    "SELECT git_sha FROM commit_logs WHERE id = ?1",
                    params![id],
                    |row| row.get::<_, Option<String>>(0),
                )
                .optional()?
                .flatten();

            let removed = conn.execute("DELETE FROM commit_logs WHERE id = ?1", params![id])?;
            if removed == 0 {
                return Err(WolfError::not_found("Commit"));
            }

            if let Some(sha) = sha {
                conn.execute(
                    "INSERT OR IGNORE INTO ignored_commits (sha, ignored_at) VALUES (?1, ?2)",
                    params![sha, now_iso()],
                )?;
            }
            Ok(())
        })
    }

    pub fn ignored_git_shas(&self) -> WolfResult<std::collections::HashSet<String>> {
        self.with_conn(|conn| {
            let mut stmt = conn.prepare("SELECT sha FROM ignored_commits")?;
            let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
            rows.collect::<Result<std::collections::HashSet<_>, _>>()
                .map_err(WolfError::from)
        })
    }

    pub fn insert_git_commits(&self, commits: &[GitCommit]) -> WolfResult<usize> {
        let ignored = self.ignored_git_shas()?;
        let rows: Vec<GitRow> = commits
            .iter()
            .filter(|commit| !ignored.contains(&commit.sha))
            .map(|commit| {
                Ok(GitRow {
                    id: new_id(),
                    day: validate_day(&commit.day)?,
                    message: validate_message(&fit_message(&commit.message))?,
                    files_changed: commit.files_changed.max(0),
                    lines_added: commit.lines_added.max(0),
                    lines_removed: commit.lines_removed.max(0),
                    created_at: now_iso(),
                    sha: commit.sha.clone(),
                })
            })
            .collect::<WolfResult<Vec<_>>>()?;

        if rows.is_empty() {
            return Ok(0);
        }

        self.with_conn(|conn| {
            let mut inserted = 0usize;
            for row in &rows {
                inserted += conn.execute(
                    "INSERT OR IGNORE INTO commit_logs
                       (id, committed_on, message, files_changed, lines_added, lines_removed, created_at, source, git_sha)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'git', ?8)",
                    params![
                        row.id,
                        row.day,
                        row.message,
                        row.files_changed,
                        row.lines_added,
                        row.lines_removed,
                        row.created_at,
                        row.sha
                    ],
                )?;
            }
            Ok(inserted)
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::test_support::test_db;

    fn entry(day: &str, message: &str) -> NewCommitLog {
        NewCommitLog {
            committed_on: day.into(),
            message: message.into(),
            files_changed: Some(1),
            lines_added: Some(10),
            lines_removed: Some(4),
        }
    }

    #[test]
    fn a_blank_message_is_rejected_rather_than_stored() {
        let db = test_db();
        assert!(db.create_commit_log(&entry("2026-10-05", "  ")).is_err());
    }

    #[test]
    fn a_bad_date_is_rejected() {
        let db = test_db();
        assert!(db
            .create_commit_log(&entry("2026-13-45", "chore: tidy"))
            .is_err());
    }

    #[test]
    fn negative_counts_are_rejected() {
        let db = test_db();
        let mut input = entry("2026-10-05", "chore: tidy");
        input.lines_added = Some(-1);
        assert!(db.create_commit_log(&input).is_err());
    }

    #[test]
    fn omitted_counts_default_to_zero() {
        let db = test_db();
        let saved = db
            .create_commit_log(&NewCommitLog {
                committed_on: "2026-10-05".into(),
                message: "docs: readme".into(),
                files_changed: None,
                lines_added: None,
                lines_removed: None,
            })
            .unwrap();
        assert_eq!(saved.files_changed, 0);
        assert_eq!(saved.lines_added, 0);
        assert_eq!(saved.lines_removed, 0);
        assert_eq!(saved.net_lines(), 0);
    }

    #[test]
    fn deleting_removes_the_row_and_deleting_twice_says_not_found() {
        let db = test_db();
        let saved = db
            .create_commit_log(&entry("2026-10-05", "feat: a"))
            .unwrap();
        db.delete_commit_log(&saved.id).unwrap();
        assert!(db.delete_commit_log(&saved.id).is_err());
        assert!(db.list_commit_logs(10).unwrap().is_empty());
    }

    fn git(sha: &str, day: &str, message: &str) -> GitCommit {
        GitCommit {
            sha: sha.into(),
            day: day.into(),
            message: message.into(),
            files_changed: 2,
            lines_added: 30,
            lines_removed: 5,
        }
    }

    #[test]
    fn syncing_the_same_sha_twice_only_stores_it_once() {
        let db = test_db();
        let commits = vec![git("abc123", "2026-10-06", "feat: one")];

        assert_eq!(db.insert_git_commits(&commits).unwrap(), 1);
        assert_eq!(db.insert_git_commits(&commits).unwrap(), 0);
        assert_eq!(db.list_commit_logs(100).unwrap().len(), 1);
    }

    #[test]
    fn a_deleted_git_commit_stays_deleted_after_the_next_sync() {
        let db = test_db();
        let commits = vec![git("abc123", "2026-10-06", "feat: one")];

        db.insert_git_commits(&commits).unwrap();
        let saved = db.list_commit_logs(100).unwrap().swap_remove(0);
        db.delete_commit_log(&saved.id).unwrap();

        assert!(db.ignored_git_shas().unwrap().contains("abc123"));
        assert_eq!(db.insert_git_commits(&commits).unwrap(), 0);
        assert!(db.list_commit_logs(100).unwrap().is_empty());
    }

    #[test]
    fn a_manual_row_has_no_sha_and_leaves_no_tombstone() {
        let db = test_db();
        let saved = db
            .create_commit_log(&entry("2026-10-05", "feat: manual"))
            .unwrap();

        db.delete_commit_log(&saved.id).unwrap();
        assert!(db.ignored_git_shas().unwrap().is_empty());
    }

    #[test]
    fn a_git_subject_longer_than_the_limit_is_trimmed_not_rejected() {
        let db = test_db();
        let long = "x".repeat(400);
        let commits = vec![git("abc123", "2026-10-06", &long)];

        let stored = db.insert_git_commits(&commits).unwrap();
        assert_eq!(stored, 1);
        assert_eq!(db.list_commit_logs(100).unwrap()[0].message.len(), 200);
    }
}
