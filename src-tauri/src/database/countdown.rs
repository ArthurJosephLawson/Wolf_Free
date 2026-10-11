use rusqlite::{params, OptionalExtension, Row};

use crate::database::Database;
use crate::error::{WolfError, WolfResult};
use crate::models::{new_id, now_iso, Countdown, CountdownUpdate, NewCountdown};

const SELECT_COLUMNS: &str =
    "id, label, target_date, current_value, target_value, completed_at, created_at, updated_at";

fn map_row(row: &Row<'_>) -> rusqlite::Result<Countdown> {
    Ok(Countdown {
        id: row.get(0)?,
        label: row.get(1)?,
        target_date: row.get(2)?,
        current_value: row.get(3)?,
        target_value: row.get(4)?,
        completed_at: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}

fn validate_label(raw: &str) -> WolfResult<String> {
    let label = raw.trim();
    if label.is_empty() {
        return Err(WolfError::invalid("A countdown needs a label."));
    }
    if label.chars().count() > 120 {
        return Err(WolfError::invalid(
            "A countdown label can be at most 120 characters.",
        ));
    }
    Ok(label.to_string())
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

fn validate_target(value: i64) -> WolfResult<i64> {
    if value > 0 {
        Ok(value)
    } else {
        Err(WolfError::invalid(
            "A countdown target has to be at least 1.",
        ))
    }
}

impl Database {
    pub fn create_countdown(&self, input: &NewCountdown) -> WolfResult<Countdown> {
        let label = validate_label(&input.label)?;
        let target_date = validate_date(input.target_date.trim())?;
        let target_value = validate_target(input.target_value.unwrap_or(1))?;
        let current_value = input.current_value.unwrap_or(0).max(0);

        let now = now_iso();
        let countdown = Countdown {
            id: new_id(),
            label,
            target_date,
            current_value,
            target_value,
            completed_at: None,
            created_at: now.clone(),
            updated_at: now,
        };

        self.with_conn(|conn| {
            conn.execute(
                "INSERT INTO countdowns
                   (id, label, target_date, current_value, target_value, completed_at, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, NULL, ?6, ?7)",
                params![
                    countdown.id,
                    countdown.label,
                    countdown.target_date,
                    countdown.current_value,
                    countdown.target_value,
                    countdown.created_at,
                    countdown.updated_at
                ],
            )?;
            Ok(())
        })?;

        Ok(countdown)
    }

    pub fn list_countdowns(&self) -> WolfResult<Vec<Countdown>> {
        self.with_conn(|conn| {
            let mut stmt = conn.prepare(&format!(
                "SELECT {SELECT_COLUMNS} FROM countdowns
                 ORDER BY completed_at IS NOT NULL ASC, target_date ASC"
            ))?;
            let rows = stmt.query_map([], map_row)?;
            rows.collect::<Result<Vec<_>, _>>().map_err(WolfError::from)
        })
    }

    pub fn get_countdown(&self, id: &str) -> WolfResult<Countdown> {
        self.with_conn(|conn| {
            conn.query_row(
                &format!("SELECT {SELECT_COLUMNS} FROM countdowns WHERE id = ?1"),
                params![id],
                map_row,
            )
            .optional()?
            .ok_or_else(|| WolfError::not_found("Countdown"))
        })
    }

    pub fn update_countdown(&self, id: &str, update: &CountdownUpdate) -> WolfResult<Countdown> {
        let label = update.label.as_deref().map(validate_label).transpose()?;
        let target_date = match &update.target_date {
            Some(v) => Some(validate_date(v.trim())?),
            None => None,
        };
        let target_value = match update.target_value {
            Some(v) => Some(validate_target(v)?),
            None => None,
        };

        self.with_tx(|conn| {
            let existing: Option<(i64, i64)> = conn
                .query_row(
                    "SELECT current_value, target_value FROM countdowns WHERE id = ?1",
                    params![id],
                    |r| Ok((r.get(0)?, r.get(1)?)),
                )
                .ok();

            let (before_current, before_target) = match existing {
                Some(v) => v,
                None => return Err(WolfError::not_found("Countdown")),
            };

            let after_current = update.current_value.unwrap_or(before_current).max(0);
            let after_target = target_value.unwrap_or(before_target);

            let reached = after_current >= after_target;
            let completed_at = if reached { Some(now_iso()) } else { None };

            let rows = conn.execute(
                "UPDATE countdowns SET
                     label         = COALESCE(?1, label),
                     target_date   = COALESCE(?2, target_date),
                     target_value  = ?3,
                     current_value = ?4,
                     completed_at  = ?5,
                     updated_at    = ?6
                 WHERE id = ?7",
                params![
                    label,
                    target_date,
                    after_target,
                    after_current,
                    completed_at,
                    now_iso(),
                    id
                ],
            )?;
            if rows == 0 {
                return Err(WolfError::not_found("Countdown"));
            }

            if reached {
                conn.execute(
                    "INSERT OR IGNORE INTO xp_events
                       (id, source_kind, source_id, amount, awarded_at, day)
                     VALUES (?1, 'countdown', ?2, ?3, ?4, ?5)",
                    params![
                        new_id(),
                        id,
                        crate::models::xp::XP_PER_COUNTDOWN,
                        now_iso(),
                        crate::models::local_day()
                    ],
                )?;
            } else {
                conn.execute(
                    "DELETE FROM xp_events WHERE source_kind = 'countdown' AND source_id = ?1",
                    params![id],
                )?;
            }
            Ok(())
        })?;

        self.get_countdown(id)
    }

    pub fn delete_countdown(&self, id: &str) -> WolfResult<()> {
        let removed = self.with_tx(|conn| {
            let removed = conn.execute("DELETE FROM countdowns WHERE id = ?1", params![id])?;
            if removed > 0 {
                conn.execute(
                    "DELETE FROM xp_events WHERE source_kind = 'countdown' AND source_id = ?1",
                    params![id],
                )?;
            }
            Ok(removed)
        })?;
        if removed == 0 {
            return Err(WolfError::not_found("Countdown"));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::test_support::test_db;

    fn new(label: &str, date: &str) -> NewCountdown {
        NewCountdown {
            label: label.into(),
            target_date: date.into(),
            target_value: None,
            current_value: None,
        }
    }

    #[test]
    fn a_blank_label_is_rejected_rather_than_stored() {
        let db = test_db();
        assert!(db.create_countdown(&new("   ", "2026-11-01")).is_err());
    }

    #[test]
    fn an_unparseable_target_date_is_rejected() {
        let db = test_db();
        assert!(db.create_countdown(&new("Ship", "01/11/2026")).is_err());
    }

    #[test]
    fn a_zero_or_negative_target_is_rejected() {
        let db = test_db();
        let mut input = new("Ship", "2026-11-01");
        input.target_value = Some(0);
        assert!(db.create_countdown(&input).is_err());

        input.target_value = Some(-3);
        assert!(db.create_countdown(&input).is_err());
    }

    #[test]
    fn defaults_are_one_target_and_zero_progress() {
        let db = test_db();
        let created = db.create_countdown(&new("Ship", "2026-11-01")).unwrap();
        assert_eq!(created.current_value, 0);
        assert_eq!(created.target_value, 1);
        assert!(created.completed_at.is_none());
    }

    #[test]
    fn reaching_the_target_stamps_completed_at_and_falling_back_clears_it() {
        let db = test_db();
        let created = db.create_countdown(&new("Ship", "2026-11-01")).unwrap();

        let done = db
            .update_countdown(
                &created.id,
                &CountdownUpdate {
                    current_value: Some(5),
                    ..Default::default()
                },
            )
            .unwrap();
        assert!(done.completed_at.is_some());

        let reopened = db
            .update_countdown(
                &created.id,
                &CountdownUpdate {
                    current_value: Some(0),
                    ..Default::default()
                },
            )
            .unwrap();
        assert!(reopened.completed_at.is_none());
    }

    #[test]
    fn landing_exactly_on_the_target_counts_as_reached() {
        let db = test_db();
        let created = db
            .create_countdown(&NewCountdown {
                label: "Ship".into(),
                target_date: "2026-11-01".into(),
                target_value: Some(1),
                current_value: None,
            })
            .unwrap();

        let reached = db
            .update_countdown(
                &created.id,
                &CountdownUpdate {
                    current_value: Some(1),
                    ..Default::default()
                },
            )
            .unwrap();
        assert!(reached.completed_at.is_some());
    }

    #[test]
    fn a_partial_update_leaves_the_other_fields_alone() {
        let db = test_db();
        let created = db
            .create_countdown(&NewCountdown {
                label: "Ship".into(),
                target_date: "2026-11-01".into(),
                target_value: Some(10),
                current_value: Some(2),
            })
            .unwrap();

        let updated = db
            .update_countdown(
                &created.id,
                &CountdownUpdate {
                    label: Some("Ship 0.2.0".into()),
                    ..Default::default()
                },
            )
            .unwrap();

        assert_eq!(updated.label, "Ship 0.2.0");
        assert_eq!(updated.target_value, 10);
        assert_eq!(updated.current_value, 2);
        assert_eq!(updated.target_date, "2026-11-01");
    }

    #[test]
    fn updating_or_deleting_something_that_is_not_there_says_not_found() {
        let db = test_db();
        assert!(db
            .update_countdown("nope", &CountdownUpdate::default())
            .is_err());
        assert!(db.delete_countdown("nope").is_err());
        assert!(db.get_countdown("nope").is_err());
    }

    #[test]
    fn open_countdowns_sort_before_finished_ones_then_by_nearest_date() {
        let db = test_db();
        let far = db.create_countdown(&new("Far", "2026-12-01")).unwrap();
        let near = db.create_countdown(&new("Near", "2026-10-10")).unwrap();
        let done = db.create_countdown(&new("Done", "2026-10-01")).unwrap();
        db.update_countdown(
            &done.id,
            &CountdownUpdate {
                current_value: Some(1),
                ..Default::default()
            },
        )
        .unwrap();

        let ids = db
            .list_countdowns()
            .unwrap()
            .into_iter()
            .map(|c| c.id)
            .collect::<Vec<_>>();
        assert_eq!(ids, vec![near.id, far.id, done.id]);
    }

    #[test]
    fn reaching_the_target_awards_countdown_xp_once_and_reopening_revokes_it() {
        let db = test_db();
        let created = db.create_countdown(&new("Ship", "2026-11-01")).unwrap();

        db.update_countdown(
            &created.id,
            &CountdownUpdate {
                current_value: Some(5),
                ..Default::default()
            },
        )
        .unwrap();
        db.update_countdown(
            &created.id,
            &CountdownUpdate {
                current_value: Some(5),
                ..Default::default()
            },
        )
        .unwrap();
        assert_eq!(db.xp_total().unwrap(), crate::models::xp::XP_PER_COUNTDOWN);

        db.update_countdown(
            &created.id,
            &CountdownUpdate {
                current_value: Some(0),
                ..Default::default()
            },
        )
        .unwrap();
        assert_eq!(db.xp_total().unwrap(), 0);

        db.update_countdown(
            &created.id,
            &CountdownUpdate {
                current_value: Some(5),
                ..Default::default()
            },
        )
        .unwrap();
        assert_eq!(db.xp_total().unwrap(), crate::models::xp::XP_PER_COUNTDOWN);
    }

    #[test]
    fn deleting_a_countdown_takes_its_xp_with_it() {
        let db = test_db();
        let created = db.create_countdown(&new("Ship", "2026-11-01")).unwrap();

        db.update_countdown(
            &created.id,
            &CountdownUpdate {
                current_value: Some(5),
                ..Default::default()
            },
        )
        .unwrap();
        assert_eq!(db.xp_total().unwrap(), crate::models::xp::XP_PER_COUNTDOWN);

        db.delete_countdown(&created.id).unwrap();

        assert_eq!(db.xp_total().unwrap(), 0);
    }
}
