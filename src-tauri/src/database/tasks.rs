use rusqlite::{params, Connection, OptionalExtension, Row};

use crate::database::Database;
use crate::error::{WolfError, WolfResult};
use crate::models::{new_id, now_iso, Task, TaskFilter, TaskListQuery, TaskSort};

const SELECT_COLUMNS: &str =
    "id, title, description, completed, priority, due_date, created_at, updated_at, completed_at";

fn map_row(row: &Row<'_>) -> rusqlite::Result<Task> {
    Ok(Task {
        id: row.get(0)?,
        title: row.get(1)?,
        description: row.get(2)?,
        completed: row.get::<_, i64>(3)? != 0,
        priority: row.get(4)?,
        due_date: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
        completed_at: row.get(8)?,
    })
}

fn validate_title(raw: &str) -> WolfResult<String> {
    let title = raw.trim();
    if title.is_empty() {
        return Err(WolfError::invalid("A task needs a title."));
    }
    if title.chars().count() > 200 {
        return Err(WolfError::invalid(
            "A task title can be at most 200 characters.",
        ));
    }
    Ok(title.to_string())
}

fn validate_priority(value: i64) -> WolfResult<i64> {
    if (0..=3).contains(&value) {
        Ok(value)
    } else {
        Err(WolfError::invalid(
            "Priority must be 0 (low), 1 (normal), 2 (high) or 3 (urgent).",
        ))
    }
}

fn validate_date(value: &str) -> WolfResult<String> {
    chrono::NaiveDate::parse_from_str(value, "%Y-%m-%d")
        .map(|_| value.to_string())
        .map_err(|_| {
            WolfError::invalid(format!(
                "`{value}` is not a valid date (expected YYYY-MM-DD)."
            ))
        })
}

impl Database {
    pub fn create_task(
        &self,
        title: &str,
        description: Option<&str>,
        priority: Option<i64>,
        due_date: Option<&str>,
    ) -> WolfResult<Task> {
        let title = validate_title(title)?;
        let priority = validate_priority(priority.unwrap_or(crate::models::PRIORITY_NORMAL))?;
        let due_date = match due_date.filter(|d| !d.trim().is_empty()) {
            Some(d) => Some(validate_date(d.trim())?),
            None => None,
        };

        let now = now_iso();
        let task = Task {
            id: new_id(),
            title,
            description: description.unwrap_or_default().to_string(),
            completed: false,
            priority,
            due_date,
            created_at: now.clone(),
            updated_at: now,
            completed_at: None,
        };

        self.with_conn(|conn| {
            conn.execute(
                "INSERT INTO tasks
                   (id, title, description, completed, priority, due_date, created_at, updated_at, completed_at)
                 VALUES (?1, ?2, ?3, 0, ?4, ?5, ?6, ?7, NULL)",
                params![
                    task.id,
                    task.title,
                    task.description,
                    task.priority,
                    task.due_date,
                    task.created_at,
                    task.updated_at
                ],
            )?;
            Ok(())
        })?;

        Ok(task)
    }

    pub fn get_task(&self, id: &str) -> WolfResult<Task> {
        self.with_conn(|conn| {
            conn.query_row(
                &format!("SELECT {SELECT_COLUMNS} FROM tasks WHERE id = ?1"),
                params![id],
                map_row,
            )
            .optional()?
            .ok_or_else(|| WolfError::not_found("Task"))
        })
    }

    pub fn list_tasks(&self, query: &TaskListQuery, today: &str) -> WolfResult<Vec<Task>> {
        let filter = query.filter.unwrap_or_default();
        let sort = query.sort.unwrap_or_default();
        let search = query
            .search
            .as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(|s| format!("%{}%", s.to_lowercase()));

        let mut sql = format!("SELECT {SELECT_COLUMNS} FROM tasks WHERE 1 = 1");
        let mut args: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        match filter {
            TaskFilter::All => {}
            TaskFilter::Active => sql.push_str(" AND completed = 0"),
            TaskFilter::Completed => sql.push_str(" AND completed = 1"),
            TaskFilter::Today => {
                sql.push_str(" AND due_date = ?");
                args.push(Box::new(today.to_string()));
            }
            TaskFilter::Overdue => {
                sql.push_str(" AND completed = 0 AND due_date IS NOT NULL AND due_date < ?");
                args.push(Box::new(today.to_string()));
            }
        }

        if let Some(pattern) = search {
            sql.push_str(" AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ?)");
            args.push(Box::new(pattern.clone()));
            args.push(Box::new(pattern));
        }

        sql.push_str(match sort {
            TaskSort::Default => {
                " ORDER BY completed ASC, due_date IS NULL ASC, due_date ASC, priority DESC, created_at ASC"
            }
            TaskSort::DueDate => {
                " ORDER BY completed ASC, due_date IS NULL ASC, due_date ASC, priority DESC"
            }
            TaskSort::Priority => " ORDER BY completed ASC, priority DESC, due_date IS NULL ASC, due_date ASC",
            TaskSort::Alphabetical => " ORDER BY completed ASC, LOWER(title) ASC",
            TaskSort::Created => " ORDER BY completed ASC, created_at DESC",
        });

        self.with_conn(|conn| {
            let mut stmt = conn.prepare(&sql)?;
            let refs: Vec<&dyn rusqlite::ToSql> = args.iter().map(|a| a.as_ref()).collect();
            let rows = stmt.query_map(refs.as_slice(), map_row)?;
            rows.collect::<Result<Vec<_>, _>>().map_err(WolfError::from)
        })
    }

    pub fn update_task(
        &self,
        id: &str,
        title: Option<&str>,
        description: Option<&str>,
        completed: Option<bool>,
        priority: Option<i64>,
        due_date: Option<Option<&str>>,
    ) -> WolfResult<Task> {
        let title = title.map(validate_title).transpose()?;
        let priority = priority.map(validate_priority).transpose()?;

        let due_date = match due_date {
            Some(Some(d)) if !d.trim().is_empty() => Some(Some(validate_date(d.trim())?)),
            Some(Some(_)) => Some(None),
            Some(None) | None => None,
        };

        let now = now_iso();
        let completed_at = completed.map(|_| now_iso());

        let changed = self.with_tx(|conn| {
            let existing: Option<(bool, Option<String>)> = conn
                .query_row(
                    "SELECT completed, due_date FROM tasks WHERE id = ?1",
                    params![id],
                    |r| Ok((r.get::<_, i64>(0)? != 0, r.get(1)?)),
                )
                .optional()?;
            let (was_completed, existing_due) = match existing {
                Some(v) => v,
                None => return Err(WolfError::not_found("Task")),
            };

            let sql = "UPDATE tasks SET
                             title        = COALESCE(?1, title),
                             description  = COALESCE(?2, description),
                             priority     = COALESCE(?3, priority),
                             completed    = COALESCE(?4, completed),
                             completed_at = CASE WHEN ?4 IS NULL THEN completed_at ELSE ?5 END,
                             updated_at   = ?6,
                             due_date     = CASE WHEN ?7 = 1 THEN ?8 ELSE due_date END
                         WHERE id = ?9";
            let rows = conn.execute(
                sql,
                params![
                    title,
                    description,
                    priority,
                    completed,
                    completed_at,
                    now,
                    due_date.is_some() as i64,
                    due_date.clone().flatten(),
                    id
                ],
            )?;

            if let Some(wanted) = completed {
                if wanted && !was_completed {
                    xp_for_completion(conn, existing_due.as_deref(), id)?;
                } else if !wanted && was_completed {
                    conn.execute(
                        "DELETE FROM xp_events WHERE source_kind = 'task' AND source_id = ?1",
                        params![id],
                    )?;
                }
            }

            Ok(rows)
        })?;

        if changed == 0 {
            return Err(WolfError::not_found("Task"));
        }
        self.get_task(id)
    }

    pub fn set_task_completed(&self, id: &str, completed: bool) -> WolfResult<Task> {
        self.update_task(id, None, None, Some(completed), None, None)
    }

    pub fn delete_task(&self, id: &str) -> WolfResult<()> {
        let removed = self.with_tx(|conn| {
            let removed = conn.execute("DELETE FROM tasks WHERE id = ?1", params![id])?;
            if removed > 0 {
                conn.execute(
                    "DELETE FROM xp_events WHERE source_kind = 'task' AND source_id = ?1",
                    params![id],
                )?;
            }
            Ok(removed)
        })?;
        if removed == 0 {
            return Err(WolfError::not_found("Task"));
        }
        Ok(())
    }

    pub fn task_stats(&self, today: &str) -> WolfResult<crate::models::task::TaskStats> {
        self.with_conn(|conn| task_stats_with(conn, today))
    }
}

fn xp_for_completion(conn: &Connection, due_date: Option<&str>, task_id: &str) -> WolfResult<()> {
    let on_time = match due_date {
        Some(due) => due >= crate::models::local_day().as_str(),
        None => true,
    };
    let amount = if on_time {
        crate::models::xp::XP_PER_TASK + crate::models::xp::XP_TASK_ON_TIME_BONUS
    } else {
        crate::models::xp::XP_PER_TASK
    };
    conn.execute(
        "INSERT OR IGNORE INTO xp_events (id, source_kind, source_id, amount, awarded_at, day)
         VALUES (?1, 'task', ?2, ?3, ?4, ?5)",
        params![
            new_id(),
            task_id,
            amount,
            now_iso(),
            crate::models::local_day()
        ],
    )?;
    Ok(())
}

pub(crate) fn task_stats_with(
    conn: &Connection,
    today: &str,
) -> WolfResult<crate::models::task::TaskStats> {
    let row = conn.query_row(
        "SELECT
            COUNT(*),
            COALESCE(SUM(completed), 0),
            COALESCE(SUM(CASE WHEN completed = 0 AND due_date = ?1 THEN 1 ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN completed = 0 AND due_date IS NOT NULL AND due_date < ?1 THEN 1 ELSE 0 END), 0)
         FROM tasks",
        params![today],
        |r| {
            Ok(crate::models::task::TaskStats {
                total: r.get::<_, i64>(0)? as u32,
                completed: r.get::<_, i64>(1)? as u32,
                open: 0,
                due_today: r.get::<_, i64>(2)? as u32,
                overdue: r.get::<_, i64>(3)? as u32,
            })
        },
    )?;

    Ok(crate::models::task::TaskStats {
        open: row.total.saturating_sub(row.completed),
        ..row
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::test_support::test_db;
    use crate::models::xp::{XP_PER_TASK, XP_TASK_ON_TIME_BONUS};

    fn day(by: i64) -> String {
        let today = chrono::Local::now().date_naive();
        (today + chrono::Duration::days(by))
            .format("%Y-%m-%d")
            .to_string()
    }

    fn xp_for(db: &Database, task_id: &str) -> Option<i64> {
        db.xp_for_source(crate::models::XpSource::Task, task_id)
            .unwrap()
            .map(|e| e.amount)
    }

    #[test]
    fn completing_a_task_with_no_due_date_earns_the_full_amount() {
        let db = test_db();
        let task = db.create_task("Write the spec", None, None, None).unwrap();

        db.set_task_completed(&task.id, true).unwrap();

        assert_eq!(
            xp_for(&db, &task.id),
            Some(XP_PER_TASK + XP_TASK_ON_TIME_BONUS)
        );
    }

    #[test]
    fn completing_a_task_before_or_on_its_due_date_earns_the_bonus() {
        let db = test_db();

        let later = db.create_task("Later", None, None, Some(&day(3))).unwrap();
        db.set_task_completed(&later.id, true).unwrap();
        assert_eq!(
            xp_for(&db, &later.id),
            Some(XP_PER_TASK + XP_TASK_ON_TIME_BONUS)
        );

        let today = db.create_task("Today", None, None, Some(&day(0))).unwrap();
        db.set_task_completed(&today.id, true).unwrap();
        assert_eq!(
            xp_for(&db, &today.id),
            Some(XP_PER_TASK + XP_TASK_ON_TIME_BONUS)
        );
    }

    #[test]
    fn completing_an_overdue_task_earns_nothing_extra() {
        let db = test_db();
        let task = db.create_task("Late", None, None, Some(&day(-2))).unwrap();

        db.set_task_completed(&task.id, true).unwrap();

        assert_eq!(xp_for(&db, &task.id), Some(XP_PER_TASK));
    }

    #[test]
    fn uncompleting_a_task_takes_the_xp_back() {
        let db = test_db();
        let task = db.create_task("Undo me", None, None, None).unwrap();

        db.set_task_completed(&task.id, true).unwrap();
        assert_eq!(db.xp_total().unwrap(), 15);

        db.set_task_completed(&task.id, false).unwrap();
        assert_eq!(xp_for(&db, &task.id), None);
        assert_eq!(db.xp_total().unwrap(), 0);
    }

    #[test]
    fn completing_an_already_completed_task_does_not_award_twice() {
        let db = test_db();
        let task = db.create_task("Once", None, None, None).unwrap();

        db.set_task_completed(&task.id, true).unwrap();
        db.set_task_completed(&task.id, true).unwrap();

        assert_eq!(db.xp_total().unwrap(), 15);
    }

    #[test]
    fn re_completing_after_undo_earns_again_with_the_current_due_date() {
        let db = test_db();
        let task = db.create_task("Slips", None, None, Some(&day(2))).unwrap();

        db.set_task_completed(&task.id, true).unwrap();
        db.set_task_completed(&task.id, false).unwrap();
        db.update_task(&task.id, None, None, None, None, Some(Some(&day(-1))))
            .unwrap();
        db.set_task_completed(&task.id, true).unwrap();

        assert_eq!(xp_for(&db, &task.id), Some(XP_PER_TASK));
    }

    #[test]
    fn changing_the_title_of_a_completed_task_leaves_its_xp_alone() {
        let db = test_db();
        let task = db.create_task("Draft", None, None, None).unwrap();
        db.set_task_completed(&task.id, true).unwrap();

        db.update_task(&task.id, Some("Final"), None, None, None, None)
            .unwrap();

        assert_eq!(
            xp_for(&db, &task.id),
            Some(XP_PER_TASK + XP_TASK_ON_TIME_BONUS)
        );
    }

    #[test]
    fn xp_events_land_on_the_local_day_not_the_utc_one() {
        let db = test_db();
        let task = db.create_task("Today", None, None, None).unwrap();

        db.set_task_completed(&task.id, true).unwrap();

        let events = db.list_xp_events(10).unwrap();
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].day, crate::models::local_day());
    }

    #[test]
    fn deleting_a_completed_task_takes_its_xp_with_it() {
        let db = test_db();
        let task = db.create_task("Trash me", None, None, None).unwrap();

        db.set_task_completed(&task.id, true).unwrap();
        assert_eq!(db.xp_total().unwrap(), 15);

        db.delete_task(&task.id).unwrap();

        assert_eq!(db.xp_total().unwrap(), 0);
        assert!(xp_for(&db, &task.id).is_none());
    }
}
