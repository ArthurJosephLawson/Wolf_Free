use tauri::State;

use crate::commands::today;
use crate::error::WolfResult;
use crate::models::focus::{FocusSession, FocusStats, NewFocusSession};
use crate::state::AppState;

#[tauri::command]
pub fn list_focus_sessions(
    state: State<'_, AppState>,
    limit: Option<u32>,
) -> WolfResult<Vec<FocusSession>> {
    state
        .db()?
        .list_focus_sessions(limit.unwrap_or(20).clamp(1, 200))
}

#[tauri::command]
pub fn create_focus_session(
    state: State<'_, AppState>,
    session: NewFocusSession,
) -> WolfResult<FocusSession> {
    state.db()?.create_focus_session(&session)
}

#[tauri::command]
pub fn delete_focus_session(state: State<'_, AppState>, id: String) -> WolfResult<()> {
    state.db()?.delete_focus_session(&id)
}

#[tauri::command]
pub fn focus_stats(state: State<'_, AppState>) -> WolfResult<FocusStats> {
    let day = today();
    let today_str = day.format("%Y-%m-%d").to_string();

    let window_start = (day - chrono::Duration::days(6))
        .format("%Y-%m-%d")
        .to_string();
    state.db()?.focus_stats(&today_str, &window_start)
}
