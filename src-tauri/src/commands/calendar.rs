use tauri::State;

use chrono::Datelike;

use crate::commands::today;
use crate::error::WolfResult;
use crate::models::calendar::{
    CalendarEvent, CalendarEventUpdate, DaySummary, EventListQuery, NewCalendarEvent,
};
use crate::state::AppState;

#[tauri::command]
pub fn list_events(
    state: State<'_, AppState>,
    query: Option<EventListQuery>,
) -> WolfResult<Vec<CalendarEvent>> {
    state.db()?.list_events(&query.unwrap_or_default())
}

#[tauri::command]
pub fn upcoming_events(
    state: State<'_, AppState>,
    limit: Option<u32>,
) -> WolfResult<Vec<CalendarEvent>> {
    let from = crate::commands::local_now();
    state
        .db()?
        .upcoming_events(&from, limit.unwrap_or(5).clamp(1, 50))
}

#[tauri::command]
pub fn create_event(
    state: State<'_, AppState>,
    event: NewCalendarEvent,
) -> WolfResult<CalendarEvent> {
    state.db()?.create_event(&event)
}

#[tauri::command]
pub fn update_event(
    state: State<'_, AppState>,
    id: String,
    update: CalendarEventUpdate,
) -> WolfResult<CalendarEvent> {
    state.db()?.update_event(&id, &update)
}

#[tauri::command]
pub fn delete_event(state: State<'_, AppState>, id: String) -> WolfResult<()> {
    state.db()?.delete_event(&id)
}

#[tauri::command]
pub fn month_summaries(
    state: State<'_, AppState>,
    year: i32,
    month: u32,
) -> WolfResult<Vec<DaySummary>> {
    if !(1..=12).contains(&month) {
        return Err(crate::error::WolfError::invalid(
            "Month must be between 1 and 12.",
        ));
    }
    let first = chrono::NaiveDate::from_ymd_opt(year, month, 1)
        .ok_or_else(|| crate::error::WolfError::invalid("That month does not exist."))?;
    let last = if month == 12 {
        chrono::NaiveDate::from_ymd_opt(year + 1, 1, 1)
    } else {
        chrono::NaiveDate::from_ymd_opt(year, month + 1, 1)
    }
    .expect("valid rollover")
        - chrono::Duration::days(1);

    let lead = first.weekday().num_days_from_monday() as i64;
    let from = first - chrono::Duration::days(lead);
    let to = last + chrono::Duration::days(6 - last.weekday().num_days_from_monday() as i64);

    state.db()?.day_summaries(from, to)
}

#[tauri::command]
pub fn events_for_day(state: State<'_, AppState>, date: String) -> WolfResult<Vec<CalendarEvent>> {
    state.db()?.list_events(&EventListQuery {
        from: Some(date.clone()),
        to: Some(date),
    })
}

#[tauri::command]
pub fn due_event_reminders(state: State<'_, AppState>) -> WolfResult<Vec<CalendarEvent>> {
    let now = chrono::Local::now();
    let settings = state.settings();
    if !settings.event_reminders_enabled {
        return Ok(Vec::new());
    }

    let horizon = now + chrono::Duration::minutes(60);
    let candidates = state.db()?.list_events(&EventListQuery {
        from: Some(now.format("%Y-%m-%d").to_string()),
        to: Some(horizon.format("%Y-%m-%d").to_string()),
    })?;

    let mut due = Vec::new();
    for event in candidates {
        let occurrence_date = event.start_time.get(..10).unwrap_or_default();
        if crate::database::calendar::notified_covers(&event, occurrence_date) {
            continue;
        }
        let Some(minutes) = event.reminder_minutes else {
            continue;
        };
        let Ok(start) = chrono::NaiveDateTime::parse_from_str(
            &event.start_time,
            crate::database::calendar::EVENT_DATETIME_FORMAT,
        ) else {
            continue;
        };

        let fire_at = start - chrono::Duration::minutes(minutes as i64);
        let Some(fire_at) = fire_at.and_local_timezone(chrono::Local).earliest() else {
            continue;
        };
        if now >= fire_at && start > now.naive_local() {
            due.push(event);
        }
    }
    Ok(due)
}

#[tauri::command]
pub fn mark_event_notified(state: State<'_, AppState>, id: String) -> WolfResult<()> {
    state.db()?.mark_event_notified(&id)
}

#[tauri::command]
pub fn calendar_overview(state: State<'_, AppState>) -> WolfResult<CalendarOverview> {
    let day = today().format("%Y-%m-%d").to_string();
    let today_events = state.db()?.list_events(&EventListQuery {
        from: Some(day.clone()),
        to: Some(day),
    })?;
    let upcoming = state
        .db()?
        .upcoming_events(&crate::commands::local_now(), 6)?;
    Ok(CalendarOverview {
        today_events,
        upcoming,
    })
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CalendarOverview {
    pub today_events: Vec<CalendarEvent>,
    pub upcoming: Vec<CalendarEvent>,
}
