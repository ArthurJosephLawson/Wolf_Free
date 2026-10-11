use tauri::State;

use crate::error::WolfResult;
use crate::models::{CommitLog, NewCommitLog};
use crate::state::AppState;

#[tauri::command]
pub fn list_commit_logs(
    state: State<'_, AppState>,
    limit: Option<u32>,
) -> WolfResult<Vec<CommitLog>> {
    state
        .db()?
        .list_commit_logs(limit.unwrap_or(100).clamp(1, 1000))
}

#[tauri::command]
pub fn create_commit_log(
    state: State<'_, AppState>,
    commit: NewCommitLog,
) -> WolfResult<CommitLog> {
    state.db()?.create_commit_log(&commit)
}

#[tauri::command]
pub fn delete_commit_log(state: State<'_, AppState>, id: String) -> WolfResult<()> {
    state.db()?.delete_commit_log(&id)
}

#[tauri::command]
pub fn sync_commit_logs(
    state: State<'_, AppState>,
    limit: Option<u32>,
) -> WolfResult<Vec<CommitLog>> {
    let limit = limit.unwrap_or(200).clamp(1, 1000);
    let repo = state.settings().repo_path;
    let found = crate::gitlog::read_git_log(&repo, limit)?;

    state.db()?.insert_git_commits(&found)?;
    state.db()?.list_commit_logs(limit)
}
