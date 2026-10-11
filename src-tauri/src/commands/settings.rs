use tauri::State;

use crate::error::WolfResult;
use crate::models::Settings;
use crate::state::AppState;

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> WolfResult<Settings> {
    Ok(state.settings())
}

#[tauri::command]
pub fn save_settings(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    settings: Settings,
) -> WolfResult<Settings> {
    let saved = state.replace_settings(settings)?;
    crate::commands::desktop::apply_settings(&app, &saved);
    Ok(saved)
}
