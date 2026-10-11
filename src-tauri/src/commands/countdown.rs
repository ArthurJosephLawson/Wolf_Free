use tauri::State;

use crate::error::WolfResult;
use crate::models::{Countdown, CountdownUpdate, NewCountdown};
use crate::state::AppState;

#[tauri::command]
pub fn list_countdowns(state: State<'_, AppState>) -> WolfResult<Vec<Countdown>> {
    state.db()?.list_countdowns()
}

#[tauri::command]
pub fn create_countdown(
    state: State<'_, AppState>,
    countdown: NewCountdown,
) -> WolfResult<Countdown> {
    state.db()?.create_countdown(&countdown)
}

#[tauri::command]
pub fn update_countdown(
    state: State<'_, AppState>,
    id: String,
    update: CountdownUpdate,
) -> WolfResult<Countdown> {
    state.db()?.update_countdown(&id, &update)
}

#[tauri::command]
pub fn delete_countdown(state: State<'_, AppState>, id: String) -> WolfResult<()> {
    state.db()?.delete_countdown(&id)
}
