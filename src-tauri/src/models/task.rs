use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub description: String,
    pub completed: bool,

    pub priority: i64,

    #[serde(default)]
    pub due_date: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    #[serde(default)]
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct NewTask {
    pub title: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub priority: Option<i64>,
    #[serde(default)]
    pub due_date: Option<String>,
}

impl NewTask {
    pub fn title(&self) -> &str {
        self.title.trim()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct TaskUpdate {
    pub title: Option<String>,
    pub description: Option<String>,
    pub completed: Option<bool>,
    pub priority: Option<i64>,
    pub due_date: Option<Option<String>>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskListQuery {
    #[serde(default)]
    pub filter: Option<crate::models::TaskFilter>,
    #[serde(default)]
    pub sort: Option<crate::models::TaskSort>,

    #[serde(default)]
    pub search: Option<String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct TaskStats {
    pub total: u32,
    pub completed: u32,
    pub open: u32,
    pub due_today: u32,
    pub overdue: u32,
}
