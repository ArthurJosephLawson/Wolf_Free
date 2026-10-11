use chrono::{Datelike, NaiveDate, NaiveDateTime};
use rusqlite::{params, OptionalExtension, Row};

use crate::database::Database;
use crate::error::{WolfError, WolfResult};
use crate::models::calendar::{
    CalendarEvent, CalendarEventUpdate, DaySummary, EventListQuery, NewCalendarEvent,
};
use crate::models::new_id;

const SELECT_COLUMNS: &str = "id, title, description, start_time, end_time, all_day, \
                              reminder_minutes, notified_at, recurrence, created_at, updated_at";

pub const EVENT_DATETIME_FORMAT: &str = "%Y-%m-%dT%H:%M";

fn map_event(row: &Row<'_>) -> rusqlite::Result<CalendarEvent> {
    Ok(CalendarEvent {
        id: row.get(0)?,
        title: row.get(1)?,
        description: row.get(2)?,
        start_time: row.get(3)?,
        end_time: row.get(4)?,
        all_day: row.get::<_, i64>(5)? != 0,
        reminder_minutes: row.get::<_, Option<i64>>(6)?.map(|v| v as u32),
        notified_at: row.get(7)?,
        recurrence: row.get(8)?,
        created_at: row.get(9)?,
        updated_at: row.get(10)?,
    })
}

pub fn parse_event_time(raw: &str, field: &str) -> WolfResult<NaiveDateTime> {
    NaiveDateTime::parse_from_str(raw.trim(), EVENT_DATETIME_FORMAT).map_err(|_| {
        WolfError::invalid(format!(
            "`{raw}` is not a valid {field} (expected YYYY-MM-DDTHH:MM)."
        ))
    })
}

fn validate_title(raw: &str) -> WolfResult<String> {
    let title = raw.trim();
    if title.is_empty() {
        return Err(WolfError::invalid("An event needs a title."));
    }
    if title.chars().count() > 200 {
        return Err(WolfError::invalid(
            "An event title can be at most 200 characters.",
        ));
    }
    Ok(title.to_string())
}

fn validate_recurrence(raw: Option<&str>) -> WolfResult<String> {
    let rule = raw.unwrap_or("none");
    if ["none", "daily", "weekdays", "weekly"].contains(&rule) {
        Ok(rule.to_string())
    } else {
        Err(WolfError::invalid(format!(
            "`{rule}` is not a recurrence Wolf knows."
        )))
    }
}

pub fn notified_covers(event: &CalendarEvent, occurrence_date: &str) -> bool {
    if event.recurrence == "none" {
        return event.notified_at.is_some();
    }
    event
        .notified_at
        .as_deref()
        .and_then(|n| n.get(..10))
        .map(|notified_date| notified_date >= occurrence_date)
        .unwrap_or(false)
}

fn occurrence_dates(
    rule: &str,
    base_date: NaiveDate,
    from: NaiveDate,
    to: NaiveDate,
) -> Vec<NaiveDate> {
    let mut dates = Vec::new();
    let mut cursor = base_date.max(from);
    while cursor <= to {
        let keep = match rule {
            "daily" => true,
            "weekdays" => {
                matches!(
                    cursor.weekday(),
                    chrono::Weekday::Mon
                        | chrono::Weekday::Tue
                        | chrono::Weekday::Wed
                        | chrono::Weekday::Thu
                        | chrono::Weekday::Fri
                )
            }
            "weekly" => cursor.weekday() == base_date.weekday(),
            _ => false,
        };
        if keep {
            dates.push(cursor);
        }
        cursor += chrono::Duration::days(1);
    }
    dates
}

fn shift_event(event: &CalendarEvent, days: i64) -> CalendarEvent {
    let shift = |raw: &str| -> String {
        match NaiveDateTime::parse_from_str(raw, EVENT_DATETIME_FORMAT) {
            Ok(dt) => (dt + chrono::Duration::days(days))
                .format(EVENT_DATETIME_FORMAT)
                .to_string(),
            Err(_) => raw.to_string(),
        }
    };
    let mut moved = event.clone();
    moved.start_time = shift(&event.start_time);
    moved.end_time = shift(&event.end_time);
    moved
}

fn base_date(event: &CalendarEvent) -> Option<NaiveDate> {
    NaiveDate::parse_from_str(event.start_time.get(..10)?, "%Y-%m-%d").ok()
}

fn expand_events(
    events: Vec<CalendarEvent>,
    from: Option<NaiveDate>,
    to: Option<NaiveDate>,
) -> Vec<CalendarEvent> {
    let (Some(from), Some(to)) = (from, to) else {
        return events;
    };
    let mut out = Vec::new();
    for event in events {
        if event.recurrence == "none" {
            out.push(event);
            continue;
        }
        let Some(start_date) = base_date(&event) else {
            out.push(event);
            continue;
        };
        for day in occurrence_dates(&event.recurrence, start_date, from, to) {
            out.push(shift_event(&event, (day - start_date).num_days()));
        }
    }
    out
}

impl Database {
    pub fn create_event(&self, input: &NewCalendarEvent) -> WolfResult<CalendarEvent> {
        let title = validate_title(&input.title)?;
        let start = parse_event_time(&input.start_time, "start time")?;
        let end = parse_event_time(&input.end_time, "end time")?;
        if end < start {
            return Err(WolfError::invalid("An event cannot end before it starts."));
        }
        if input.all_day.unwrap_or(false) && end.date() != start.date() {
            return Err(WolfError::invalid(
                "An all-day event must start and end on the same day.",
            ));
        }

        let recurrence = validate_recurrence(input.recurrence.as_deref())?;
        let now = now();
        let event = CalendarEvent {
            id: new_id(),
            title,
            description: input.description.clone().unwrap_or_default(),
            start_time: start.format(EVENT_DATETIME_FORMAT).to_string(),
            end_time: end.format(EVENT_DATETIME_FORMAT).to_string(),
            all_day: input.all_day.unwrap_or(false),
            reminder_minutes: input.reminder_minutes.filter(|m| *m <= 24 * 60),
            notified_at: None,
            recurrence,
            created_at: now.clone(),
            updated_at: now,
        };

        self.with_conn(|conn| {
            conn.execute(
                "INSERT INTO calendar_events
                   (id, title, description, start_time, end_time, all_day, reminder_minutes, notified_at, recurrence, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, NULL, ?8, ?9, ?10)",
                params![
                    event.id,
                    event.title,
                    event.description,
                    event.start_time,
                    event.end_time,
                    event.all_day as i64,
                    event.reminder_minutes.map(|m| m as i64),
                    event.recurrence,
                    event.created_at,
                    event.updated_at
                ],
            )?;
            Ok(())
        })?;

        Ok(event)
    }

    pub fn get_event(&self, id: &str) -> WolfResult<CalendarEvent> {
        self.with_conn(|conn| {
            conn.query_row(
                &format!("SELECT {SELECT_COLUMNS} FROM calendar_events WHERE id = ?1"),
                params![id],
                map_event,
            )
            .optional()?
            .ok_or_else(|| WolfError::not_found("Event"))
        })
    }

    pub fn list_events(&self, query: &EventListQuery) -> WolfResult<Vec<CalendarEvent>> {
        let from = query
            .from
            .as_deref()
            .and_then(|d| NaiveDate::parse_from_str(d, "%Y-%m-%d").ok())
            .map(|d| d.format("%Y-%m-%dT00:00").to_string());
        let to = query
            .to
            .as_deref()
            .and_then(|d| NaiveDate::parse_from_str(d, "%Y-%m-%d").ok())
            .map(|d| d.format("%Y-%m-%dT23:59").to_string());

        let from_date = query
            .from
            .as_deref()
            .and_then(|d| NaiveDate::parse_from_str(d, "%Y-%m-%d").ok());
        let to_date = query
            .to
            .as_deref()
            .and_then(|d| NaiveDate::parse_from_str(d, "%Y-%m-%d").ok());

        let mut sql = format!("SELECT {SELECT_COLUMNS} FROM calendar_events WHERE 1 = 1");
        let mut args: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(from) = from {
            sql.push_str(" AND (recurrence <> 'none' OR end_time >= ?)");
            args.push(Box::new(from));
        }
        if let Some(to) = to {
            sql.push_str(" AND start_time <= ?");
            args.push(Box::new(to));
        }
        sql.push_str(" ORDER BY all_day DESC, start_time ASC, title ASC");

        self.with_conn(|conn| {
            let mut stmt = conn.prepare(&sql)?;
            let refs: Vec<&dyn rusqlite::ToSql> = args.iter().map(|a| a.as_ref()).collect();
            let rows = stmt.query_map(refs.as_slice(), map_event)?;
            let events = rows
                .collect::<Result<Vec<_>, _>>()
                .map_err(WolfError::from)?;
            Ok(expand_events(events, from_date, to_date))
        })
    }

    pub fn upcoming_events(&self, from_local: &str, limit: u32) -> WolfResult<Vec<CalendarEvent>> {
        let from_dt = NaiveDateTime::parse_from_str(from_local, EVENT_DATETIME_FORMAT)
            .ok()
            .or_else(|| {
                NaiveDate::parse_from_str(from_local.get(..10)?, "%Y-%m-%d")
                    .ok()
                    .map(|d| d.and_time(chrono::NaiveTime::MIN))
            });
        let from_date = from_dt.as_ref().map(|dt| dt.date());

        let mut events = self.with_conn(|conn| {
            let mut stmt = conn.prepare(&format!(
                "SELECT {SELECT_COLUMNS} FROM calendar_events
                 WHERE end_time >= ?1 OR recurrence <> 'none'"
            ))?;
            let rows = stmt.query_map(params![from_local], map_event)?;
            rows.collect::<Result<Vec<_>, _>>().map_err(WolfError::from)
        })?;

        let horizon = from_date.map(|d| d + chrono::Duration::days(366));
        events = expand_events(events, from_date, horizon);
        if from_dt.is_some() {
            events.retain(|e| e.end_time.as_str() >= from_local);
        }
        events.sort_by(|a, b| {
            b.all_day
                .cmp(&a.all_day)
                .then(a.start_time.cmp(&b.start_time))
                .then(a.title.cmp(&b.title))
        });
        events.truncate(limit as usize);
        Ok(events)
    }

    pub fn update_event(
        &self,
        id: &str,
        update: &CalendarEventUpdate,
    ) -> WolfResult<CalendarEvent> {
        let title = update.title.as_deref().map(validate_title).transpose()?;
        let start = update
            .start_time
            .as_deref()
            .map(|v| parse_event_time(v, "start time"))
            .transpose()?;
        let end = update
            .end_time
            .as_deref()
            .map(|v| parse_event_time(v, "end time"))
            .transpose()?;
        let reminder = update.reminder_minutes.map(|m| m.filter(|v| *v <= 24 * 60));
        let recurrence = update
            .recurrence
            .as_deref()
            .map(|r| validate_recurrence(Some(r)))
            .transpose()?;
        let now = now();

        let changed = self.with_conn(|conn| {
            let existing: Option<CalendarEvent> = conn
                .query_row(
                    &format!("SELECT {SELECT_COLUMNS} FROM calendar_events WHERE id = ?1"),
                    params![id],
                    map_event,
                )
                .optional()?;
            let Some(mut existing) = existing else {
                return Err(WolfError::not_found("Event"));
            };

            if let Some(t) = title.clone() {
                existing.title = t;
            }
            if let Some(d) = update.description.clone() {
                existing.description = d;
            }
            if let Some(s) = start {
                existing.start_time = s.format(EVENT_DATETIME_FORMAT).to_string();
            }
            if let Some(e) = end {
                existing.end_time = e.format(EVENT_DATETIME_FORMAT).to_string();
            }
            if existing.end_time < existing.start_time {
                return Err(WolfError::invalid("An event cannot end before it starts."));
            }
            if let Some(a) = update.all_day {
                existing.all_day = a;
            }
            if existing.all_day {
                let s_date = existing.start_time.get(..10).unwrap_or_default();
                let e_date = existing.end_time.get(..10).unwrap_or_default();
                if s_date != e_date {
                    return Err(WolfError::invalid(
                        "An all-day event must start and end on the same day.",
                    ));
                }
            }
            if let Some(r) = reminder {
                existing.reminder_minutes = r;

                existing.notified_at = None;
            }
            if let Some(r) = recurrence {
                existing.recurrence = r;
            }
            existing.updated_at = now.clone();

            let rows = conn.execute(
                "UPDATE calendar_events SET
                     title            = ?1,
                     description      = ?2,
                     start_time       = ?3,
                     end_time         = ?4,
                     all_day          = ?5,
                     reminder_minutes = ?6,
                     notified_at      = ?7,
                     recurrence       = ?8,
                     updated_at       = ?9
                 WHERE id = ?10",
                params![
                    existing.title,
                    existing.description,
                    existing.start_time,
                    existing.end_time,
                    existing.all_day as i64,
                    existing.reminder_minutes.map(|m| m as i64),
                    existing.notified_at,
                    existing.recurrence,
                    existing.updated_at,
                    id
                ],
            )?;
            Ok(rows)
        })?;

        if changed == 0 {
            return Err(WolfError::not_found("Event"));
        }
        self.get_event(id)
    }

    pub fn delete_event(&self, id: &str) -> WolfResult<()> {
        let removed = self.with_conn(|conn| {
            Ok(conn.execute("DELETE FROM calendar_events WHERE id = ?1", params![id])?)
        })?;
        if removed == 0 {
            return Err(WolfError::not_found("Event"));
        }
        Ok(())
    }

    pub fn mark_event_notified(&self, id: &str) -> WolfResult<()> {
        self.with_conn(|conn| {
            conn.execute(
                "UPDATE calendar_events SET notified_at = ?1 WHERE id = ?2",
                params![now(), id],
            )?;
            Ok(())
        })
    }

    pub fn day_summaries(&self, from: NaiveDate, to: NaiveDate) -> WolfResult<Vec<DaySummary>> {
        let events = self.list_events(&EventListQuery {
            from: Some(from.format("%Y-%m-%d").to_string()),
            to: Some(to.format("%Y-%m-%d").to_string()),
        })?;

        let mut counts: std::collections::BTreeMap<String, (u32, u32)> = Default::default();
        self.with_conn(|conn| {
            let mut stmt = conn.prepare(
                "SELECT due_date,
                        COUNT(*),
                        COALESCE(SUM(completed), 0)
                 FROM tasks
                 WHERE due_date IS NOT NULL AND due_date >= ?1 AND due_date <= ?2
                 GROUP BY due_date",
            )?;
            let rows = stmt.query_map(
                params![
                    from.format("%Y-%m-%d").to_string(),
                    to.format("%Y-%m-%d").to_string()
                ],
                |r| {
                    Ok((
                        r.get::<_, String>(0)?,
                        r.get::<_, i64>(1)? as u32,
                        r.get::<_, i64>(2)? as u32,
                    ))
                },
            )?;
            for row in rows {
                let (date, total, done) = row?;
                counts.insert(date, (total, done));
            }
            Ok(())
        })?;

        let mut out = Vec::with_capacity((to - from).num_days() as usize + 1);
        let mut cursor = from;
        while cursor <= to {
            let key = cursor.format("%Y-%m-%d").to_string();
            let day_events: Vec<CalendarEvent> = events
                .iter()
                .filter(|e| {
                    e.start_time.starts_with(&key) || (e.all_day && e.end_time.starts_with(&key))
                })
                .cloned()
                .collect();
            let (task_count, completed_task_count) = counts.get(&key).copied().unwrap_or((0, 0));
            out.push(DaySummary {
                date: key,
                events: day_events,
                task_count,
                completed_task_count,
            });
            cursor += chrono::Duration::days(1);
        }
        Ok(out)
    }
}

fn now() -> String {
    crate::models::now_iso()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::test_support::test_db;

    fn new_event(start: &str, end: &str) -> NewCalendarEvent {
        NewCalendarEvent {
            title: "Standup".into(),
            description: Some("daily sync".into()),
            start_time: start.into(),
            end_time: end.into(),
            all_day: Some(false),
            reminder_minutes: Some(10),
            recurrence: None,
        }
    }

    #[test]
    fn create_and_read_back() {
        let db = test_db();
        let created = db
            .create_event(&new_event("2026-09-28T09:00", "2026-09-28T09:15"))
            .expect("create");
        assert_eq!(created.title, "Standup");
        assert_eq!(created.reminder_minutes, Some(10));
        assert!(created.notified_at.is_none());

        let fetched = db.get_event(&created.id).expect("get");
        assert_eq!(fetched, created);
    }

    #[test]
    fn rejects_reversed_times() {
        let db = test_db();
        let err = db
            .create_event(&new_event("2026-09-28T10:00", "2026-09-28T09:00"))
            .expect_err("should fail");
        assert_eq!(err.kind(), "invalid");
    }

    #[test]
    fn range_query_includes_overlapping_events() {
        let db = test_db();
        db.create_event(&new_event("2026-09-27T22:00", "2026-09-28T02:00"))
            .unwrap();
        db.create_event(&new_event("2026-09-30T09:00", "2026-09-30T10:00"))
            .unwrap();

        let found = db
            .list_events(&EventListQuery {
                from: Some("2026-09-28".into()),
                to: Some("2026-09-28".into()),
            })
            .expect("list");
        assert_eq!(found.len(), 1, "overnight event overlaps the 28th");
    }

    #[test]
    fn update_rejects_invalid_bounds_and_keeps_state() {
        let db = test_db();
        let created = db
            .create_event(&new_event("2026-09-28T09:00", "2026-09-28T09:15"))
            .unwrap();

        let err = db
            .update_event(
                &created.id,
                &CalendarEventUpdate {
                    end_time: Some("2026-09-28T08:00".into()),
                    ..Default::default()
                },
            )
            .expect_err("should fail");
        assert_eq!(err.kind(), "invalid");

        let unchanged = db.get_event(&created.id).unwrap();
        assert_eq!(unchanged.end_time, "2026-09-28T09:15");
    }

    #[test]
    fn changing_reminder_rearms_it() {
        let db = test_db();
        let created = db
            .create_event(&new_event("2026-09-28T09:00", "2026-09-28T09:15"))
            .unwrap();
        db.mark_event_notified(&created.id).unwrap();
        assert!(db.get_event(&created.id).unwrap().notified_at.is_some());

        let updated = db
            .update_event(
                &created.id,
                &CalendarEventUpdate {
                    reminder_minutes: Some(Some(30)),
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(updated.reminder_minutes, Some(30));
        assert!(updated.notified_at.is_none());
    }

    #[test]
    fn delete_and_missing_id() {
        let db = test_db();
        let created = db
            .create_event(&new_event("2026-09-28T09:00", "2026-09-28T09:15"))
            .unwrap();
        db.delete_event(&created.id).unwrap();
        assert_eq!(db.get_event(&created.id).unwrap_err().kind(), "not_found");
        assert_eq!(db.delete_event("nope").unwrap_err().kind(), "not_found");
    }

    #[test]
    fn day_summaries_include_task_counts() {
        let db = test_db();
        db.create_event(&new_event("2026-09-28T09:00", "2026-09-28T09:15"))
            .unwrap();
        db.create_task("Write report", None, None, Some("2026-09-28"))
            .unwrap();

        let from = NaiveDate::from_ymd_opt(2026, 9, 28).unwrap();
        let to = NaiveDate::from_ymd_opt(2026, 9, 29).unwrap();
        let summaries = db.day_summaries(from, to).unwrap();

        assert_eq!(summaries.len(), 2);
        assert_eq!(summaries[0].events.len(), 1);
        assert_eq!(summaries[0].task_count, 1);
        assert_eq!(summaries[1].task_count, 0);
    }

    #[test]
    fn all_day_events_must_fit_one_day() {
        let db = test_db();
        let err = db
            .create_event(&NewCalendarEvent {
                title: "Conference".into(),
                start_time: "2026-09-28T00:00".into(),
                end_time: "2026-09-29T00:00".into(),
                all_day: Some(true),
                ..Default::default()
            })
            .expect_err("should fail");
        assert_eq!(err.kind(), "invalid");
    }

    #[test]
    fn an_unknown_recurrence_rule_is_rejected() {
        let db = test_db();
        let err = db
            .create_event(&NewCalendarEvent {
                recurrence: Some("hourly".into()),
                ..new_event("2026-09-28T09:00", "2026-09-28T09:15")
            })
            .expect_err("should fail");
        assert_eq!(err.kind(), "invalid");
    }

    #[test]
    fn a_daily_event_expands_into_every_day_of_the_window() {
        let db = test_db();
        db.create_event(&NewCalendarEvent {
            recurrence: Some("daily".into()),
            ..new_event("2026-09-28T09:00", "2026-09-28T09:15")
        })
        .unwrap();

        let found = db
            .list_events(&EventListQuery {
                from: Some("2026-09-28".into()),
                to: Some("2026-09-30".into()),
            })
            .unwrap();

        assert_eq!(found.len(), 3);
        assert_eq!(found[0].start_time, "2026-09-28T09:00");
        assert_eq!(found[1].start_time, "2026-09-29T09:00");
        assert_eq!(
            found[2].start_time,
            "2026-09-30T09:15".replace("09:15", "09:00")
        );
        assert!(found.iter().all(|e| e.recurrence == "daily"));
    }

    #[test]
    fn weekdays_skip_the_weekend_and_weekly_keeps_the_original_weekday() {
        let db = test_db();
        db.create_event(&NewCalendarEvent {
            title: "Weekdays".into(),
            recurrence: Some("weekdays".into()),
            ..new_event("2026-09-28T09:00", "2026-09-28T09:15")
        })
        .unwrap();
        db.create_event(&NewCalendarEvent {
            title: "Weekly".into(),
            recurrence: Some("weekly".into()),
            ..new_event("2026-09-28T13:00", "2026-09-28T13:30")
        })
        .unwrap();

        let found = db
            .list_events(&EventListQuery {
                from: Some("2026-09-28".into()),
                to: Some("2026-10-05".into()),
            })
            .unwrap();

        let weekdays: Vec<_> = found.iter().filter(|e| e.title == "Weekdays").collect();
        let weekly: Vec<_> = found.iter().filter(|e| e.title == "Weekly").collect();

        assert_eq!(weekdays.len(), 6, "two weekdays runs from Monday the 28th");
        assert!(weekdays
            .iter()
            .all(|e| !e.start_time.starts_with("2026-10-03")
                && !e.start_time.starts_with("2026-10-04")));
        assert_eq!(weekly.len(), 2, "2026-09-28 and 2026-10-05, both Mondays");
        assert_eq!(weekly[1].start_time, "2026-10-05T13:00");
    }

    #[test]
    fn a_recurring_event_whose_start_is_before_the_window_still_shows() {
        let db = test_db();
        db.create_event(&NewCalendarEvent {
            recurrence: Some("daily".into()),
            ..new_event("2026-01-01T09:00", "2026-01-01T09:15")
        })
        .unwrap();

        let found = db
            .list_events(&EventListQuery {
                from: Some("2026-09-28".into()),
                to: Some("2026-09-28".into()),
            })
            .unwrap();

        assert_eq!(found.len(), 1);
        assert_eq!(found[0].start_time, "2026-09-28T09:00");
    }

    #[test]
    fn upcoming_reaches_back_to_a_recurring_series_started_in_the_past() {
        let db = test_db();
        db.create_event(&NewCalendarEvent {
            recurrence: Some("daily".into()),
            ..new_event("2026-01-01T09:00", "2026-01-01T09:15")
        })
        .unwrap();

        let upcoming = db.upcoming_events("2026-09-29T08:00", 3).unwrap();

        assert_eq!(upcoming.len(), 3);
        assert_eq!(upcoming[0].start_time, "2026-09-29T09:00");
    }

    #[test]
    fn updating_the_rule_persists() {
        let db = test_db();
        let created = db
            .create_event(&new_event("2026-09-28T09:00", "2026-09-28T09:15"))
            .unwrap();

        let updated = db
            .update_event(
                &created.id,
                &CalendarEventUpdate {
                    recurrence: Some("weekly".into()),
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(updated.recurrence, "weekly");
        assert_eq!(db.get_event(&created.id).unwrap().recurrence, "weekly");
    }

    #[test]
    fn only_yet_unnotified_occurrences_of_a_recurring_event_are_covered() {
        let plain = CalendarEvent {
            id: "p".into(),
            title: "One shot".into(),
            description: String::new(),
            start_time: "2026-09-28T09:00".into(),
            end_time: "2026-09-28T09:15".into(),
            all_day: false,
            reminder_minutes: Some(10),
            notified_at: Some("2026-09-20T08:50:00.000Z".into()),
            recurrence: "none".into(),
            created_at: "now".into(),
            updated_at: "now".into(),
        };
        assert!(notified_covers(&plain, "2026-09-28"));

        let mut recurring = plain.clone();
        recurring.recurrence = "daily".into();
        recurring.notified_at = Some("2026-09-27T08:50:00.000Z".into());
        assert!(
            !notified_covers(&recurring, "2026-09-28"),
            "yesterday's notification does not cover today's occurrence"
        );

        recurring.notified_at = Some("2026-09-28T08:50:00.000Z".into());
        assert!(notified_covers(&recurring, "2026-09-28"));

        recurring.notified_at = None;
        assert!(!notified_covers(&recurring, "2026-09-28"));
    }
}
