use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum FocusSessionKind {
    Focus,
    ShortBreak,
    LongBreak,
}

impl FocusSessionKind {
    pub fn as_str(self) -> &'static str {
        match self {
            FocusSessionKind::Focus => "focus",
            FocusSessionKind::ShortBreak => "short_break",
            FocusSessionKind::LongBreak => "long_break",
        }
    }

    pub fn parse(raw: &str) -> Self {
        match raw {
            "short_break" => FocusSessionKind::ShortBreak,
            "long_break" => FocusSessionKind::LongBreak,
            _ => FocusSessionKind::Focus,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FocusSession {
    pub id: String,
    pub started_at: String,
    #[serde(default)]
    pub ended_at: Option<String>,
    pub duration_seconds: u32,
    pub completed: bool,
    pub kind: FocusSessionKind,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct NewFocusSession {
    pub started_at: String,
    #[serde(default)]
    pub ended_at: Option<String>,
    #[serde(default)]
    pub duration_seconds: Option<u32>,
    #[serde(default)]
    pub completed: Option<bool>,
    #[serde(default)]
    pub kind: Option<FocusSessionKind>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct FocusStats {
    pub completed_today: u32,
    pub completed_week: u32,
    pub total_completed: u32,
    pub focus_minutes_today: u32,
    pub focus_minutes_week: u32,

    pub daily_minutes: Vec<DailyFocus>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DailyFocus {
    pub date: String,
    pub minutes: u32,
}
