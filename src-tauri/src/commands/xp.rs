use tauri::State;

use crate::commands::today;
use crate::error::WolfResult;
use crate::models::XpSummary;
use crate::state::AppState;

#[tauri::command]
pub fn xp_summary(state: State<'_, AppState>, days: Option<u32>) -> WolfResult<XpSummary> {
    let day = today();
    let window = days.unwrap_or(28).clamp(1, 365);

    let end = day.format("%Y-%m-%d").to_string();
    let start = (day - chrono::Duration::days(window as i64 - 1))
        .format("%Y-%m-%d")
        .to_string();

    state.db()?.xp_summary(&start, &end)
}
