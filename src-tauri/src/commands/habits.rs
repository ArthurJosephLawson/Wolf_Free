use tauri::State;

use crate::commands::today;
use crate::error::WolfResult;
use crate::models::habit::{Habit, HabitCompletion, HabitUpdate, HabitWithProgress, NewHabit};
use crate::state::AppState;

#[tauri::command]
pub fn list_habits(
    state: State<'_, AppState>,
    include_archived: Option<bool>,
) -> WolfResult<Vec<HabitWithProgress>> {
    state
        .db()?
        .list_habits_with_progress(include_archived.unwrap_or(false), today())
}

#[tauri::command]
pub fn create_habit(state: State<'_, AppState>, habit: NewHabit) -> WolfResult<Habit> {
    state.db()?.create_habit(&habit)
}

#[tauri::command]
pub fn update_habit(
    state: State<'_, AppState>,
    id: String,
    update: HabitUpdate,
) -> WolfResult<Habit> {
    state.db()?.update_habit(&id, &update)
}

#[tauri::command]
pub fn set_habit_archived(
    state: State<'_, AppState>,
    id: String,
    archived: bool,
) -> WolfResult<Habit> {
    state.db()?.archive_habit(&id, archived)
}

#[tauri::command]
pub fn delete_habit(state: State<'_, AppState>, id: String) -> WolfResult<()> {
    state.db()?.delete_habit(&id)
}

#[tauri::command]
pub fn complete_habit(
    state: State<'_, AppState>,
    habit_id: String,
    date: Option<String>,
) -> WolfResult<HabitCompletion> {
    let date = date.unwrap_or_else(|| today().format("%Y-%m-%d").to_string());
    state.db()?.complete_habit(&habit_id, &date)
}

#[tauri::command]
pub fn uncomplete_habit(
    state: State<'_, AppState>,
    habit_id: String,
    date: String,
) -> WolfResult<()> {
    state.db()?.uncomplete_habit(&habit_id, &date)
}

#[tauri::command]
pub fn list_habit_completions(state: State<'_, AppState>, id: String) -> WolfResult<Vec<String>> {
    state.db()?.list_habit_completions(&id)
}
