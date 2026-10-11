use serde::{Deserialize, Serialize};

pub mod calendar;
pub mod commit;
pub mod countdown;
pub mod focus;
pub mod habit;
pub mod settings;
pub mod task;
pub mod xp;

pub const PRIORITY_NORMAL: i64 = 1;

pub fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}

pub fn new_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

pub fn local_day() -> String {
    chrono::Local::now().format("%Y-%m-%d").to_string()
}

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TaskSort {
    #[default]
    Default,
    DueDate,
    Priority,
    Alphabetical,
    Created,
}

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TaskFilter {
    #[default]
    All,
    Active,
    Completed,
    Today,
    Overdue,
}

pub use calendar::{
    CalendarEvent, CalendarEventUpdate, DaySummary, EventListQuery, NewCalendarEvent,
};
pub use commit::{CommitLog, NewCommitLog};
pub use countdown::{Countdown, CountdownUpdate, NewCountdown};
pub use focus::{DailyFocus, FocusSession, FocusSessionKind, FocusStats, NewFocusSession};
pub use habit::{
    Habit, HabitCompletion, HabitDay, HabitFrequency, HabitUpdate, HabitWithProgress, NewHabit,
};
pub use settings::{Settings, SettingsPatch};
pub use task::{NewTask, Task, TaskListQuery, TaskStats, TaskUpdate};
pub use xp::{
    cumulative_xp_for_level, level_for, xp_for_next_level, xp_into_level, XpEvent, XpSource,
    XpSummary,
};
