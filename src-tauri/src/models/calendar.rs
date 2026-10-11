use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CalendarEvent {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub description: String,

    pub start_time: String,
    pub end_time: String,
    pub all_day: bool,
    #[serde(default)]
    pub reminder_minutes: Option<u32>,

    #[serde(default)]
    pub notified_at: Option<String>,
    #[serde(default)]
    pub recurrence: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct NewCalendarEvent {
    pub title: String,
    #[serde(default)]
    pub description: Option<String>,
    pub start_time: String,
    pub end_time: String,
    #[serde(default)]
    pub all_day: Option<bool>,
    #[serde(default)]
    pub reminder_minutes: Option<u32>,
    #[serde(default)]
    pub recurrence: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CalendarEventUpdate {
    pub title: Option<String>,
    pub description: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub all_day: Option<bool>,
    pub reminder_minutes: Option<Option<u32>>,
    #[serde(default)]
    pub recurrence: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct EventListQuery {
    #[serde(default)]
    pub from: Option<String>,

    #[serde(default)]
    pub to: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DaySummary {
    pub date: String,
    pub events: Vec<CalendarEvent>,
    pub task_count: u32,
    pub completed_task_count: u32,
}
