use tauri::State;

use crate::commands::today;
use crate::error::WolfResult;
use crate::models::task::{NewTask, Task, TaskListQuery, TaskStats, TaskUpdate};
use crate::models::{TaskFilter, TaskSort};
use crate::state::AppState;

#[tauri::command]
pub fn list_tasks(
    state: State<'_, AppState>,
    query: Option<TaskListQuery>,
) -> WolfResult<Vec<Task>> {
    let query = query.unwrap_or_default();
    state
        .db()?
        .list_tasks(&query, &today().format("%Y-%m-%d").to_string())
}

#[tauri::command]
pub fn create_task(state: State<'_, AppState>, task: NewTask) -> WolfResult<Task> {
    state.db()?.create_task(
        task.title(),
        task.description.as_deref(),
        task.priority,
        task.due_date.as_deref(),
    )
}

#[tauri::command]
pub fn update_task(state: State<'_, AppState>, id: String, update: TaskUpdate) -> WolfResult<Task> {
    state.db()?.update_task(
        &id,
        update.title.as_deref(),
        update.description.as_deref(),
        update.completed,
        update.priority,
        update.due_date.as_ref().map(|d| d.as_deref()),
    )
}

#[tauri::command]
pub fn set_task_completed(
    state: State<'_, AppState>,
    id: String,
    completed: bool,
) -> WolfResult<Task> {
    state.db()?.set_task_completed(&id, completed)
}

#[tauri::command]
pub fn delete_task(state: State<'_, AppState>, id: String) -> WolfResult<()> {
    state.db()?.delete_task(&id)
}

#[tauri::command]
pub fn task_stats(state: State<'_, AppState>) -> WolfResult<TaskStats> {
    state
        .db()?
        .task_stats(&today().format("%Y-%m-%d").to_string())
}

#[tauri::command]
pub fn task_overview(state: State<'_, AppState>) -> WolfResult<TaskOverview> {
    let day = today().format("%Y-%m-%d").to_string();
    let stats = state.db()?.task_stats(&day)?;
    let today_tasks = state.db()?.list_tasks(
        &TaskListQuery {
            filter: Some(TaskFilter::Today),
            sort: Some(TaskSort::Default),
            search: None,
        },
        &day,
    )?;
    let overdue = state.db()?.list_tasks(
        &TaskListQuery {
            filter: Some(TaskFilter::Overdue),
            sort: Some(TaskSort::Default),
            search: None,
        },
        &day,
    )?;

    Ok(TaskOverview {
        stats,
        today: today_tasks,
        overdue,
    })
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskOverview {
    pub stats: TaskStats,
    pub today: Vec<Task>,
    pub overdue: Vec<Task>,
}
