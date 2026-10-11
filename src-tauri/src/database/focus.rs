use std::collections::HashMap;

use rusqlite::{params, Row};

use crate::database::Database;
use crate::error::{WolfError, WolfResult};
use crate::models::focus::{
    DailyFocus, FocusSession, FocusSessionKind, FocusStats, NewFocusSession,
};
use crate::models::{new_id, now_iso};

const SELECT_COLUMNS: &str = "id, started_at, ended_at, duration_seconds, completed, kind";

fn map_session(row: &Row<'_>) -> rusqlite::Result<FocusSession> {
    Ok(FocusSession {
        id: row.get(0)?,
        started_at: row.get(1)?,
        ended_at: row.get(2)?,
        duration_seconds: row.get::<_, i64>(3)? as u32,
        completed: row.get::<_, i64>(4)? != 0,
        kind: FocusSessionKind::parse(&row.get::<_, String>(5)?),
    })
}

impl Database {
    pub fn create_focus_session(&self, input: &NewFocusSession) -> WolfResult<FocusSession> {
        let started_at = validate_instant(&input.started_at, "start time")?;
        let ended_at = match &input.ended_at {
            Some(v) => Some(validate_instant(v, "end time")?),
            None => None,
        };
        if let Some(e) = ended_at {
            if e < started_at {
                return Err(WolfError::invalid(
                    "A focus session cannot end before it starts.",
                ));
            }
        }

        let session = FocusSession {
            id: new_id(),
            started_at: started_at.to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
            ended_at: ended_at.map(|e| e.to_rfc3339_opts(chrono::SecondsFormat::Millis, true)),
            duration_seconds: input.duration_seconds.unwrap_or(0).min(24 * 60 * 60),
            completed: input.completed.unwrap_or(false),
            kind: input.kind.unwrap_or(FocusSessionKind::Focus),
        };

        self.with_tx(|conn| {
            conn.execute(
                "INSERT INTO focus_sessions
                   (id, started_at, ended_at, duration_seconds, completed, kind)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    session.id,
                    session.started_at,
                    session.ended_at,
                    session.duration_seconds,
                    session.completed as i64,
                    session.kind.as_str()
                ],
            )?;

            if session.completed && session.kind == FocusSessionKind::Focus {
                conn.execute(
                    "INSERT OR IGNORE INTO xp_events
                       (id, source_kind, source_id, amount, awarded_at, day)
                     VALUES (?1, 'focus', ?2, ?3, ?4, ?5)",
                    params![
                        new_id(),
                        session.id,
                        crate::models::xp::XP_PER_FOCUS_SESSION,
                        now_iso(),
                        local_day_of(started_at)
                    ],
                )?;
            }
            Ok(())
        })?;

        Ok(session)
    }

    pub fn list_focus_sessions(&self, limit: u32) -> WolfResult<Vec<FocusSession>> {
        self.with_conn(|conn| {
            let mut stmt = conn.prepare(&format!(
                "SELECT {SELECT_COLUMNS} FROM focus_sessions ORDER BY started_at DESC LIMIT ?1"
            ))?;
            let rows = stmt.query_map(params![limit], map_session)?;
            rows.collect::<Result<Vec<_>, _>>().map_err(WolfError::from)
        })
    }

    pub fn delete_focus_session(&self, id: &str) -> WolfResult<()> {
        let removed = self.with_tx(|conn| {
            let removed = conn.execute("DELETE FROM focus_sessions WHERE id = ?1", params![id])?;
            if removed > 0 {
                conn.execute(
                    "DELETE FROM xp_events WHERE source_kind = 'focus' AND source_id = ?1",
                    params![id],
                )?;
            }
            Ok(removed)
        })?;
        if removed == 0 {
            return Err(WolfError::not_found("Focus session"));
        }
        Ok(())
    }

    pub fn focus_stats(&self, today_local: &str, week_start_local: &str) -> WolfResult<FocusStats> {
        let first = parse_local_day(week_start_local)?;
        let days: Vec<DayWindow> = (0..7)
            .map(|offset| {
                let date = first + chrono::Duration::days(offset);
                Ok(DayWindow {
                    day: date.format("%Y-%m-%d").to_string(),
                    from: local_day_start(date)?,
                    until: local_day_start(date + chrono::Duration::days(1))?,
                })
            })
            .collect::<WolfResult<Vec<_>>>()?;

        self.with_conn(|conn| {
            let mut sql = String::from("WITH days(day, from_utc, until_utc) AS (VALUES ");
            let mut values: Vec<rusqlite::types::Value> = Vec::with_capacity(days.len() * 3);
            for (index, window) in days.iter().enumerate() {
                if index > 0 {
                    sql.push_str(", ");
                }
                let base = index * 3;
                sql.push_str(&format!("(?{}, ?{}, ?{})", base + 1, base + 2, base + 3));
                values.push(window.day.clone().into());
                values.push(window.from.clone().into());
                values.push(window.until.clone().into());
            }
            sql.push_str(
                ") SELECT days.day,
                         COUNT(sessions.id),
                         COALESCE(SUM(sessions.duration_seconds), 0) / 60
                  FROM days
                  LEFT JOIN focus_sessions AS sessions
                    ON sessions.started_at >= days.from_utc
                   AND sessions.started_at < days.until_utc
                   AND sessions.completed = 1
                   AND sessions.kind = 'focus'
                  GROUP BY days.day",
            );

            let mut stmt = conn.prepare(&sql)?;
            let rows = stmt.query_map(rusqlite::params_from_iter(values.iter()), |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, i64>(1)?,
                    r.get::<_, i64>(2)?,
                ))
            })?;
            let counted: HashMap<String, (i64, i64)> = rows
                .map(|row| row.map(|(day, count, minutes)| (day, (count, minutes))))
                .collect::<Result<_, _>>()?;

            let daily_minutes: Vec<DailyFocus> = days
                .iter()
                .map(|window| {
                    let (_, minutes) = counted.get(&window.day).copied().unwrap_or((0, 0));
                    DailyFocus {
                        date: window.day.clone(),
                        minutes: minutes.max(0) as u32,
                    }
                })
                .collect();

            let minutes_of =
                |day: &str| -> i64 { counted.get(day).map(|(_, minutes)| *minutes).unwrap_or(0) };
            let count_of =
                |day: &str| -> i64 { counted.get(day).map(|(count, _)| *count).unwrap_or(0) };

            let total_completed: i64 = conn.query_row(
                "SELECT COUNT(*) FROM focus_sessions WHERE completed = 1 AND kind = 'focus'",
                [],
                |r| r.get(0),
            )?;

            let week_counts: i64 = counted.values().map(|(count, _)| *count).sum();
            let week_minutes: i64 = counted.values().map(|(_, minutes)| *minutes).sum();

            Ok(FocusStats {
                completed_today: count_of(today_local).max(0) as u32,
                completed_week: week_counts.max(0) as u32,
                total_completed: total_completed.max(0) as u32,
                focus_minutes_today: minutes_of(today_local).max(0) as u32,
                focus_minutes_week: week_minutes.max(0) as u32,
                daily_minutes,
            })
        })
    }
}

struct DayWindow {
    day: String,
    from: String,
    until: String,
}

fn parse_local_day(value: &str) -> WolfResult<chrono::NaiveDate> {
    chrono::NaiveDate::parse_from_str(value, "%Y-%m-%d").map_err(|_| {
        WolfError::invalid(format!(
            "`{value}` is not a valid date (expected YYYY-MM-DD)."
        ))
    })
}

fn local_day_start(date: chrono::NaiveDate) -> WolfResult<String> {
    for hour in 0..4 {
        let Some(naive) = date.and_hms_opt(hour, 0, 0) else {
            continue;
        };
        if let Some(local) = naive.and_local_timezone(chrono::Local).earliest() {
            return Ok(local
                .with_timezone(&chrono::Utc)
                .to_rfc3339_opts(chrono::SecondsFormat::Millis, true));
        }
    }
    Err(WolfError::internal(format!(
        "Could not work out when {date} starts in your timezone."
    )))
}

fn local_day_of(instant: chrono::DateTime<chrono::Utc>) -> String {
    instant
        .with_timezone(&chrono::Local)
        .format("%Y-%m-%d")
        .to_string()
}

fn validate_instant(raw: &str, field: &str) -> WolfResult<chrono::DateTime<chrono::Utc>> {
    chrono::DateTime::parse_from_rfc3339(raw.trim())
        .map(|dt| dt.with_timezone(&chrono::Utc))
        .map_err(|_| {
            WolfError::invalid(format!(
                "`{raw}` is not a valid {field} (expected an RFC 3339 timestamp)."
            ))
        })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::test_support::test_db;

    fn local_session(date: &str, hour: u32, minute: u32, minutes: u32) -> NewFocusSession {
        let day = chrono::NaiveDate::parse_from_str(date, "%Y-%m-%d").expect("valid date");
        let started = day
            .and_hms_opt(hour, minute, 0)
            .expect("valid time")
            .and_local_timezone(chrono::Local)
            .earliest()
            .unwrap_or_else(|| {
                panic!("{date} {hour}:{minute} does not exist in the local timezone")
            });
        let ended = started + chrono::Duration::minutes(minutes as i64);
        let stamp = |t: chrono::DateTime<chrono::Local>| {
            t.with_timezone(&chrono::Utc)
                .to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
        };
        NewFocusSession {
            started_at: stamp(started),
            ended_at: Some(stamp(ended)),
            duration_seconds: Some(minutes * 60),
            completed: Some(true),
            kind: Some(FocusSessionKind::Focus),
        }
    }

    fn session(start: &str, minutes: u32) -> NewFocusSession {
        local_session(start, 9, 0, minutes)
    }

    #[test]
    fn create_and_list() {
        let db = test_db();
        let created = db
            .create_focus_session(&session("2026-09-28", 25))
            .expect("create");
        assert!(created.completed);
        assert_eq!(created.duration_seconds, 1500);
        assert_eq!(db.list_focus_sessions(10).unwrap().len(), 1);
    }

    #[test]
    fn stats_count_today_and_week() {
        let db = test_db();
        db.create_focus_session(&session("2026-09-28", 25)).unwrap();
        db.create_focus_session(&session("2026-09-28", 25)).unwrap();
        db.create_focus_session(&session("2026-09-21", 25)).unwrap();

        let stats = db.focus_stats("2026-09-28", "2026-09-22").expect("stats");
        assert_eq!(stats.completed_today, 2);
        assert_eq!(stats.completed_week, 2);
        assert_eq!(stats.total_completed, 3);
        assert_eq!(stats.focus_minutes_today, 50);
        assert_eq!(stats.daily_minutes.len(), 7);
    }

    #[test]
    fn breaks_are_not_counted_as_focus() {
        let db = test_db();
        let mut input = session("2026-09-28", 5);
        input.kind = Some(FocusSessionKind::ShortBreak);
        db.create_focus_session(&input).unwrap();

        let stats = db.focus_stats("2026-09-28", "2026-09-22").unwrap();
        assert_eq!(stats.completed_today, 0);
        assert_eq!(stats.focus_minutes_today, 0);
    }

    #[test]
    fn incomplete_sessions_are_excluded() {
        let db = test_db();
        let mut input = session("2026-09-28", 25);
        input.completed = Some(false);
        db.create_focus_session(&input).unwrap();
        assert_eq!(
            db.focus_stats("2026-09-28", "2026-09-22")
                .unwrap()
                .completed_today,
            0
        );
    }

    #[test]
    fn rejects_backwards_session() {
        let db = test_db();
        let input = NewFocusSession {
            started_at: "2026-09-28T10:00:00Z".into(),
            ended_at: Some("2026-09-28T09:00:00Z".into()),
            ..Default::default()
        };
        assert_eq!(
            db.create_focus_session(&input).unwrap_err().kind(),
            "invalid"
        );
    }

    #[test]
    fn rejects_malformed_timestamp() {
        let db = test_db();
        let input = NewFocusSession {
            started_at: "yesterday".into(),
            ..Default::default()
        };
        assert_eq!(
            db.create_focus_session(&input).unwrap_err().kind(),
            "invalid"
        );
    }

    #[test]
    fn daily_series_is_dense() {
        let db = test_db();
        db.create_focus_session(&session("2026-09-22", 25)).unwrap();
        let stats = db.focus_stats("2026-09-28", "2026-09-22").unwrap();
        let dates: Vec<&str> = stats
            .daily_minutes
            .iter()
            .map(|d| d.date.as_str())
            .collect();
        assert_eq!(
            dates,
            vec![
                "2026-09-22",
                "2026-09-23",
                "2026-09-24",
                "2026-09-25",
                "2026-09-26",
                "2026-09-27",
                "2026-09-28"
            ]
        );
        assert_eq!(stats.daily_minutes[0].minutes, 25);
        assert_eq!(stats.daily_minutes[6].minutes, 0);
    }

    #[test]
    fn sessions_straddling_local_midnight_stay_in_their_own_day() {
        let db = test_db();
        db.create_focus_session(&local_session("2026-09-27", 23, 30, 25))
            .unwrap();
        db.create_focus_session(&local_session("2026-09-28", 0, 30, 50))
            .unwrap();

        let stats = db.focus_stats("2026-09-28", "2026-09-22").expect("stats");
        let minutes = |day: &str| {
            stats
                .daily_minutes
                .iter()
                .find(|d| d.date == day)
                .map(|d| d.minutes)
                .unwrap_or(u32::MAX)
        };

        assert_eq!(
            minutes("2026-09-27"),
            25,
            "late session belongs to the 27th"
        );
        assert_eq!(
            minutes("2026-09-28"),
            50,
            "early session belongs to the 28th"
        );
        assert_eq!(stats.focus_minutes_today, 50);
        assert_eq!(stats.completed_today, 1);
        assert_eq!(stats.focus_minutes_week, 75);
    }

    #[test]
    fn a_session_exactly_at_local_midnight_belongs_to_the_new_day() {
        let db = test_db();
        db.create_focus_session(&local_session("2026-09-28", 0, 0, 25))
            .unwrap();
        db.create_focus_session(&local_session("2026-09-27", 23, 59, 25))
            .unwrap();

        let stats = db.focus_stats("2026-09-28", "2026-09-22").expect("stats");
        let minutes = |day: &str| {
            stats
                .daily_minutes
                .iter()
                .find(|d| d.date == day)
                .map(|d| d.minutes)
                .unwrap_or(u32::MAX)
        };

        assert_eq!(minutes("2026-09-28"), 25, "midnight starts the new day");
        assert_eq!(minutes("2026-09-27"), 25);
    }

    #[test]
    fn day_bounds_are_ordered_and_contiguous() {
        let first = parse_local_day("2026-09-22").unwrap();
        let mut previous = local_day_start(first).unwrap();
        for offset in 0..7 {
            let date = first + chrono::Duration::days(offset);
            let start = local_day_start(date).unwrap();
            let end = local_day_start(date + chrono::Duration::days(1)).unwrap();
            assert_eq!(start, previous, "window for {date} is not contiguous");
            assert!(start < end, "window for {date} is not ordered");
            previous = end;
        }
    }

    #[test]
    fn a_completed_focus_session_earns_xp_on_the_day_it_started() {
        let db = test_db();
        let session = db
            .create_focus_session(&local_session("2026-10-05", 9, 0, 25))
            .unwrap();

        assert_eq!(
            db.xp_total().unwrap(),
            crate::models::xp::XP_PER_FOCUS_SESSION
        );

        let events = db.list_xp_events(10).unwrap();
        assert_eq!(events[0].source_kind, crate::models::XpSource::Focus);
        assert_eq!(events[0].source_id, session.id);
        assert_eq!(events[0].day, "2026-10-05");
    }

    #[test]
    fn a_break_earns_nothing() {
        let db = test_db();
        let mut input = local_session("2026-10-05", 9, 25, 5);
        input.kind = Some(FocusSessionKind::ShortBreak);

        db.create_focus_session(&input).unwrap();

        assert_eq!(db.xp_total().unwrap(), 0);
    }

    #[test]
    fn an_unfinished_session_earns_nothing() {
        let db = test_db();
        let mut input = local_session("2026-10-05", 9, 0, 25);
        input.completed = Some(false);

        db.create_focus_session(&input).unwrap();

        assert_eq!(db.xp_total().unwrap(), 0);
    }

    #[test]
    fn deleting_a_session_takes_its_xp_with_it() {
        let db = test_db();
        let session = db
            .create_focus_session(&local_session("2026-10-05", 9, 0, 25))
            .unwrap();
        assert_eq!(
            db.xp_total().unwrap(),
            crate::models::xp::XP_PER_FOCUS_SESSION
        );

        db.delete_focus_session(&session.id).unwrap();

        assert_eq!(db.xp_total().unwrap(), 0);
    }
}
