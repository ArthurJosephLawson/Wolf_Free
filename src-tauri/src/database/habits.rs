use std::collections::BTreeSet;

use chrono::{Datelike, Duration, NaiveDate};
use rusqlite::{params, Connection, OptionalExtension, Row};

use crate::database::Database;
use crate::error::{WolfError, WolfResult};
use crate::models::habit::{
    Habit, HabitCompletion, HabitDay, HabitFrequency, HabitUpdate, HabitWithProgress, NewHabit,
};
use crate::models::{new_id, now_iso};

const SELECT_COLUMNS: &str =
    "id, name, description, frequency, target_per_period, color, created_at, archived";

const RECENT_WINDOW_DAYS: i64 = 28;

fn map_habit(row: &Row<'_>) -> rusqlite::Result<Habit> {
    Ok(Habit {
        id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        frequency: HabitFrequency::parse(&row.get::<_, String>(3)?),
        target_per_period: row.get::<_, i64>(4)? as u32,
        color: row.get(5)?,
        created_at: row.get(6)?,
        archived: row.get::<_, i64>(7)? != 0,
    })
}

fn validate_name(raw: &str) -> WolfResult<String> {
    let name = raw.trim();
    if name.is_empty() {
        return Err(WolfError::invalid("A habit needs a name."));
    }
    if name.chars().count() > 120 {
        return Err(WolfError::invalid(
            "A habit name can be at most 120 characters.",
        ));
    }
    Ok(name.to_string())
}

const HORIZON_DAYS: i64 = 400;

fn scheduled_dates(habit: &Habit, today: NaiveDate) -> BTreeSet<NaiveDate> {
    let mut set = BTreeSet::new();
    let mut cursor = today;
    let mut guard = 0;
    while guard < HORIZON_DAYS {
        if habit.frequency.is_due_on(cursor.weekday()) {
            set.insert(cursor);
        }
        cursor -= Duration::days(1);
        guard += 1;
    }
    set
}

pub fn current_streak(completions: &BTreeSet<NaiveDate>, habit: &Habit, today: NaiveDate) -> u32 {
    let scheduled = scheduled_dates(habit, today);
    let mut streak = 0u32;
    let mut cursor = today;

    if scheduled.contains(&cursor) && !completions.contains(&cursor) {
        cursor -= Duration::days(1);
    }

    while streak < HORIZON_DAYS as u32 {
        if scheduled.contains(&cursor) {
            if completions.contains(&cursor) {
                streak += 1;
            } else {
                break;
            }
        }
        cursor -= Duration::days(1);
    }
    streak
}

pub fn longest_streak(completions: &BTreeSet<NaiveDate>, habit: &Habit, today: NaiveDate) -> u32 {
    let scheduled = scheduled_dates(habit, today);
    let mut best = 0u32;
    let mut run = 0u32;

    for date in scheduled.iter() {
        if completions.contains(date) {
            run += 1;
            best = best.max(run);
        } else {
            run = 0;
        }
    }
    best
}

impl Database {
    pub fn create_habit(&self, input: &NewHabit) -> WolfResult<Habit> {
        let name = validate_name(&input.name)?;
        let habit = Habit {
            id: new_id(),
            name,
            description: input.description.clone().unwrap_or_default(),
            frequency: input.frequency.unwrap_or(HabitFrequency::Daily),
            target_per_period: input.target_per_period.unwrap_or(1).clamp(1, 14),
            color: input
                .color
                .clone()
                .filter(|c| !c.trim().is_empty())
                .unwrap_or_else(|| "green".to_string()),
            created_at: crate::models::now_iso(),
            archived: false,
        };

        self.with_conn(|conn| {
            conn.execute(
                "INSERT INTO habits (id, name, description, frequency, target_per_period, color, created_at, archived)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 0)",
                params![
                    habit.id,
                    habit.name,
                    habit.description,
                    habit.frequency.as_str(),
                    habit.target_per_period,
                    habit.color,
                    habit.created_at
                ],
            )?;
            Ok(())
        })?;

        Ok(habit)
    }

    pub fn get_habit(&self, id: &str) -> WolfResult<Habit> {
        self.with_conn(|conn| {
            conn.query_row(
                &format!("SELECT {SELECT_COLUMNS} FROM habits WHERE id = ?1"),
                params![id],
                map_habit,
            )
            .optional()?
            .ok_or_else(|| WolfError::not_found("Habit"))
        })
    }

    pub fn list_habits(&self, include_archived: bool) -> WolfResult<Vec<Habit>> {
        let sql = if include_archived {
            format!("SELECT {SELECT_COLUMNS} FROM habits ORDER BY archived ASC, created_at ASC")
        } else {
            format!(
                "SELECT {SELECT_COLUMNS} FROM habits WHERE archived = 0 ORDER BY created_at ASC"
            )
        };
        self.with_conn(|conn| {
            let mut stmt = conn.prepare(&sql)?;
            let rows = stmt.query_map([], map_habit)?;
            rows.collect::<Result<Vec<_>, _>>().map_err(WolfError::from)
        })
    }

    pub fn update_habit(&self, id: &str, update: &HabitUpdate) -> WolfResult<Habit> {
        let name = update.name.as_deref().map(validate_name).transpose()?;
        let target = update
            .target_per_period
            .map(|t| t.clamp(1, 14))
            .unwrap_or(0);
        let archived = update.archived.map(|a| a as i64);

        let changed = self.with_conn(|conn| {
            let exists: Option<String> = conn
                .query_row("SELECT id FROM habits WHERE id = ?1", params![id], |r| {
                    r.get(0)
                })
                .optional()?;
            if exists.is_none() {
                return Err(WolfError::not_found("Habit"));
            }
            Ok(conn.execute(
                "UPDATE habits SET
                     name              = COALESCE(?1, name),
                     description       = COALESCE(?2, description),
                     frequency         = COALESCE(?3, frequency),
                     target_per_period = CASE WHEN ?4 = 0 THEN target_per_period ELSE ?4 END,
                     color             = COALESCE(?5, color),
                     archived          = COALESCE(?6, archived)
                 WHERE id = ?7",
                params![
                    name,
                    update.description,
                    update.frequency.map(|f| f.as_str()),
                    target,
                    update.color,
                    archived,
                    id
                ],
            )?)
        })?;

        if changed == 0 {
            return Err(WolfError::not_found("Habit"));
        }
        self.get_habit(id)
    }

    pub fn archive_habit(&self, id: &str, archived: bool) -> WolfResult<Habit> {
        self.update_habit(
            id,
            &HabitUpdate {
                archived: Some(archived),
                ..Default::default()
            },
        )
    }

    pub fn delete_habit(&self, id: &str) -> WolfResult<()> {
        let removed = self.with_tx(|conn| {
            let completion_ids: Vec<String> = {
                let mut stmt =
                    conn.prepare("SELECT id FROM habit_completions WHERE habit_id = ?1")?;
                let rows = stmt.query_map(params![id], |r| r.get::<_, String>(0))?;
                rows.collect::<Result<Vec<_>, _>>()?
            };
            let removed = conn.execute("DELETE FROM habits WHERE id = ?1", params![id])?;
            if removed > 0 {
                for completion_id in &completion_ids {
                    conn.execute(
                        "DELETE FROM xp_events WHERE source_kind = 'habit' AND source_id = ?1",
                        params![completion_id],
                    )?;
                }
            }
            Ok(removed)
        })?;
        if removed == 0 {
            return Err(WolfError::not_found("Habit"));
        }
        Ok(())
    }

    pub fn complete_habit(&self, habit_id: &str, date: &str) -> WolfResult<HabitCompletion> {
        let habit = self.get_habit(habit_id)?;
        let normalized = normalize_date(date)?;

        let completion = HabitCompletion {
            id: new_id(),
            habit_id: habit.id.clone(),
            completed_at: normalized.to_string(),
        };

        self.with_tx(|conn| {
            let inserted = conn.execute(
                "INSERT INTO habit_completions (id, habit_id, completed_at)
                 VALUES (?1, ?2, ?3)
                 ON CONFLICT (habit_id, completed_at) DO NOTHING",
                params![completion.id, completion.habit_id, completion.completed_at],
            )?;
            if inserted == 1 {
                conn.execute(
                    "INSERT OR IGNORE INTO xp_events
                       (id, source_kind, source_id, amount, awarded_at, day)
                     VALUES (?1, 'habit', ?2, ?3, ?4, ?5)",
                    params![
                        new_id(),
                        completion.id,
                        crate::models::xp::XP_PER_HABIT,
                        now_iso(),
                        completion.completed_at
                    ],
                )?;
            }
            Ok(())
        })?;

        Ok(completion)
    }

    pub fn uncomplete_habit(&self, habit_id: &str, date: &str) -> WolfResult<()> {
        let normalized = normalize_date(date)?;
        self.with_tx(|conn| {
            let completion_id: Option<String> = conn
                .query_row(
                    "SELECT id FROM habit_completions WHERE habit_id = ?1 AND completed_at = ?2",
                    params![habit_id, normalized.to_string()],
                    |r| r.get(0),
                )
                .optional()?;

            conn.execute(
                "DELETE FROM habit_completions WHERE habit_id = ?1 AND completed_at = ?2",
                params![habit_id, normalized.to_string()],
            )?;

            if let Some(id) = completion_id {
                conn.execute(
                    "DELETE FROM xp_events WHERE source_kind = 'habit' AND source_id = ?1",
                    params![id],
                )?;
            }
            Ok(())
        })
    }

    pub fn list_habit_completions(&self, habit_id: &str) -> WolfResult<Vec<String>> {
        self.with_conn(|conn| {
            let mut stmt = conn.prepare(
                "SELECT completed_at FROM habit_completions WHERE habit_id = ?1 ORDER BY completed_at",
            )?;
            let rows = stmt.query_map(params![habit_id], |r| r.get::<_, String>(0))?;
            rows.collect::<Result<Vec<_>, _>>().map_err(WolfError::from)
        })
    }

    pub fn list_habits_with_progress(
        &self,
        include_archived: bool,
        today: NaiveDate,
    ) -> WolfResult<Vec<HabitWithProgress>> {
        let habits = self.list_habits(include_archived)?;
        habits
            .into_iter()
            .map(|habit| self.habit_progress(&habit, today))
            .collect()
    }

    pub fn habit_progress(&self, habit: &Habit, today: NaiveDate) -> WolfResult<HabitWithProgress> {
        let dates = self.list_habit_completions(&habit.id)?;
        Ok(build_progress(habit, today, &dates))
    }

    pub fn habit_summaries(
        &self,
        today: NaiveDate,
        include_archived: bool,
    ) -> WolfResult<Vec<HabitWithProgress>> {
        self.with_conn(|conn| habit_summaries(conn, today, include_archived))
    }
}

fn normalize_date(date: &str) -> WolfResult<NaiveDate> {
    NaiveDate::parse_from_str(date.trim(), "%Y-%m-%d").map_err(|_| {
        WolfError::invalid(format!(
            "`{date}` is not a valid date (expected YYYY-MM-DD)."
        ))
    })
}

pub fn build_progress(habit: &Habit, today: NaiveDate, dates: &[String]) -> HabitWithProgress {
    let completions: BTreeSet<NaiveDate> = dates
        .iter()
        .filter_map(|d| NaiveDate::parse_from_str(d, "%Y-%m-%d").ok())
        .collect();
    let scheduled = scheduled_dates(habit, today);

    let recent: Vec<HabitDay> = (0..RECENT_WINDOW_DAYS)
        .rev()
        .map(|offset| {
            let date = today - Duration::days(offset);
            HabitDay {
                date: date.format("%Y-%m-%d").to_string(),
                completed: completions.contains(&date),
                scheduled: scheduled.contains(&date),
            }
        })
        .collect();

    let window_start = today - Duration::days(29);

    HabitWithProgress {
        habit: habit.clone(),
        today: today.format("%Y-%m-%d").to_string(),
        completed_today: completions.contains(&today),
        current_streak: current_streak(&completions, habit, today),
        longest_streak: longest_streak(&completions, habit, today),
        completions_30d: completions.range(window_start..=today).count() as u32,
        recent,
    }
}

pub fn habit_summaries(
    conn: &Connection,
    today: NaiveDate,
    include_archived: bool,
) -> WolfResult<Vec<HabitWithProgress>> {
    let sql = if include_archived {
        format!("SELECT {SELECT_COLUMNS} FROM habits ORDER BY created_at ASC")
    } else {
        format!("SELECT {SELECT_COLUMNS} FROM habits WHERE archived = 0 ORDER BY created_at ASC")
    };
    let mut stmt = conn.prepare(&sql)?;
    let habits: Vec<Habit> = stmt
        .query_map([], map_habit)?
        .collect::<Result<Vec<_>, _>>()?;

    let mut out = Vec::with_capacity(habits.len());
    for habit in habits {
        let mut stmt = conn.prepare(
            "SELECT completed_at FROM habit_completions WHERE habit_id = ?1 ORDER BY completed_at",
        )?;
        let dates: Vec<String> = stmt
            .query_map(params![habit.id], |r| r.get::<_, String>(0))?
            .collect::<Result<Vec<_>, _>>()?;
        out.push(build_progress(&habit, today, &dates));
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::test_support::test_db;

    fn habit(frequency: HabitFrequency) -> Habit {
        Habit {
            id: "h1".into(),
            name: "Read".into(),
            description: String::new(),
            frequency,
            target_per_period: 1,
            color: "green".into(),
            created_at: "2026-01-01T00:00:00.000Z".into(),
            archived: false,
        }
    }

    fn date(s: &str) -> NaiveDate {
        NaiveDate::parse_from_str(s, "%Y-%m-%d").unwrap()
    }

    fn set(dates: &[&str]) -> BTreeSet<NaiveDate> {
        dates.iter().map(|d| date(d)).collect()
    }

    #[test]
    fn daily_streak_counts_consecutive_days() {
        let completions = set(&["2026-09-28", "2026-09-27", "2026-09-26"]);
        let streak = current_streak(
            &completions,
            &habit(HabitFrequency::Daily),
            date("2026-09-28"),
        );
        assert_eq!(streak, 3);
    }

    #[test]
    fn unfinished_today_does_not_break_the_streak() {
        let completions = set(&["2026-09-27", "2026-09-26", "2026-09-25"]);
        let streak = current_streak(
            &completions,
            &habit(HabitFrequency::Daily),
            date("2026-09-28"),
        );
        assert_eq!(streak, 3);
    }

    #[test]
    fn missing_day_breaks_the_streak() {
        let completions = set(&["2026-09-28", "2026-09-26"]);
        let streak = current_streak(
            &completions,
            &habit(HabitFrequency::Daily),
            date("2026-09-28"),
        );
        assert_eq!(streak, 1);
    }

    #[test]
    fn weekday_habit_skips_the_weekend() {
        let friday = habit(HabitFrequency::Weekdays);
        let completions = set(&["2026-09-25"]);
        let streak = current_streak(&completions, &friday, date("2026-09-28"));
        assert_eq!(
            streak, 1,
            "weekend days are not scheduled and do not break the run"
        );
    }

    #[test]
    fn weekday_habit_breaks_when_a_weekday_is_missed() {
        let weekday_habit = habit(HabitFrequency::Weekdays);

        let completions = set(&["2026-09-24", "2026-09-28"]);
        let streak = current_streak(&completions, &weekday_habit, date("2026-09-28"));
        assert_eq!(streak, 1);
    }

    #[test]
    fn longest_streak_finds_the_best_historical_run() {
        let completions = set(&[
            "2026-09-01",
            "2026-09-02",
            "2026-09-03",
            "2026-09-05",
            "2026-09-06",
            "2026-09-07",
            "2026-09-08",
        ]);
        let h = habit(HabitFrequency::Daily);
        assert_eq!(longest_streak(&completions, &h, date("2026-09-08")), 4);
        assert_eq!(current_streak(&completions, &h, date("2026-09-08")), 4);
    }

    #[test]
    fn progress_marks_today_and_recent_grid() {
        let h = habit(HabitFrequency::Daily);
        let progress = build_progress(&h, date("2026-09-28"), &["2026-09-28".to_string()]);
        assert!(progress.completed_today);
        assert_eq!(progress.recent.len(), 28);
        assert_eq!(progress.recent.last().unwrap().date, "2026-09-28");
        assert_eq!(progress.completions_30d, 1);
    }

    #[test]
    fn crud_round_trip() {
        let db = test_db();
        let created = db
            .create_habit(&NewHabit {
                name: "Stretch".into(),
                description: Some("morning".into()),
                frequency: Some(HabitFrequency::Weekdays),
                target_per_period: Some(1),
                color: Some("cyan".into()),
            })
            .expect("create");

        assert_eq!(created.name, "Stretch");
        assert_eq!(created.frequency, HabitFrequency::Weekdays);

        let updated = db
            .update_habit(
                &created.id,
                &HabitUpdate {
                    name: Some("Stretch more".into()),
                    ..Default::default()
                },
            )
            .expect("update");
        assert_eq!(updated.name, "Stretch more");

        db.complete_habit(&created.id, "2026-09-28")
            .expect("complete");
        db.complete_habit(&created.id, "2026-09-28")
            .expect("idempotent");
        assert_eq!(db.list_habit_completions(&created.id).unwrap().len(), 1);

        let progress = db
            .list_habits_with_progress(false, date("2026-09-28"))
            .expect("progress");
        assert_eq!(progress.len(), 1);
        assert!(progress[0].completed_today);

        db.uncomplete_habit(&created.id, "2026-09-28")
            .expect("uncomplete");
        assert!(db.list_habit_completions(&created.id).unwrap().is_empty());

        db.delete_habit(&created.id).expect("delete");
        assert!(db.list_habits(false).unwrap().is_empty());
    }

    #[test]
    fn deleting_habit_cascades_completions() {
        let db = test_db();
        let h = db
            .create_habit(&NewHabit {
                name: "Run".into(),
                ..Default::default()
            })
            .unwrap();
        db.complete_habit(&h.id, "2026-09-28").unwrap();
        db.delete_habit(&h.id).unwrap();

        let remaining: i64 = db
            .with_conn(|conn| {
                Ok(conn.query_row("SELECT COUNT(*) FROM habit_completions", [], |r| r.get(0))?)
            })
            .unwrap();
        assert_eq!(remaining, 0);
    }

    #[test]
    fn blank_name_is_rejected() {
        let db = test_db();
        let err = db
            .create_habit(&NewHabit {
                name: "   ".into(),
                ..Default::default()
            })
            .unwrap_err();
        assert_eq!(err.kind(), "invalid");
    }

    #[test]
    fn completing_a_habit_day_earns_xp_once() {
        let db = test_db();
        let habit = db
            .create_habit(&NewHabit {
                name: "Read".into(),
                ..Default::default()
            })
            .unwrap();

        db.complete_habit(&habit.id, "2026-10-05").unwrap();
        assert_eq!(db.xp_total().unwrap(), crate::models::xp::XP_PER_HABIT);

        db.complete_habit(&habit.id, "2026-10-05").unwrap();
        assert_eq!(db.xp_total().unwrap(), crate::models::xp::XP_PER_HABIT);
    }

    #[test]
    fn two_days_of_one_habit_are_two_separate_awards() {
        let db = test_db();
        let habit = db
            .create_habit(&NewHabit {
                name: "Read".into(),
                ..Default::default()
            })
            .unwrap();

        db.complete_habit(&habit.id, "2026-10-04").unwrap();
        db.complete_habit(&habit.id, "2026-10-05").unwrap();

        assert_eq!(db.xp_total().unwrap(), crate::models::xp::XP_PER_HABIT * 2);
    }

    #[test]
    fn uncompleting_a_habit_day_takes_that_days_xp_back() {
        let db = test_db();
        let habit = db
            .create_habit(&NewHabit {
                name: "Read".into(),
                ..Default::default()
            })
            .unwrap();

        db.complete_habit(&habit.id, "2026-10-04").unwrap();
        db.complete_habit(&habit.id, "2026-10-05").unwrap();
        db.uncomplete_habit(&habit.id, "2026-10-05").unwrap();

        assert_eq!(db.xp_total().unwrap(), crate::models::xp::XP_PER_HABIT);
    }

    #[test]
    fn deleting_a_habit_takes_every_days_xp_with_it() {
        let db = test_db();
        let habit = db
            .create_habit(&NewHabit {
                name: "Read".into(),
                ..Default::default()
            })
            .unwrap();

        db.complete_habit(&habit.id, "2026-10-04").unwrap();
        db.complete_habit(&habit.id, "2026-10-05").unwrap();
        assert_eq!(db.xp_total().unwrap(), crate::models::xp::XP_PER_HABIT * 2);

        db.delete_habit(&habit.id).unwrap();

        assert_eq!(db.xp_total().unwrap(), 0);
    }
}
