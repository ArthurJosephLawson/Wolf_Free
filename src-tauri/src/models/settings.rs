use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub focus_minutes: u32,
    pub short_break_minutes: u32,
    pub long_break_minutes: u32,

    pub sessions_before_long_break: u32,
    pub auto_start_breaks: bool,
    pub auto_start_focus: bool,

    pub notifications_enabled: bool,
    pub event_reminders_enabled: bool,
    pub sound_enabled: bool,

    pub companion_enabled: bool,
    pub companion_always_on_top: bool,
    pub companion_scale: f64,
    pub companion_x: Option<f64>,
    pub companion_y: Option<f64>,
    pub companion_click_action: String,
    pub companion_idle_animations: bool,

    pub start_minimized: bool,
    pub close_to_tray: bool,
    #[serde(alias = "crtEffectsEnabled")]
    pub effects_enabled: bool,

    pub accent: String,
    pub text_size: String,
    pub density: String,
    pub developer_mode: bool,

    pub user_name: String,
    pub repo_path: String,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            focus_minutes: 25,
            short_break_minutes: 5,
            long_break_minutes: 15,
            sessions_before_long_break: 4,
            auto_start_breaks: false,
            auto_start_focus: false,

            notifications_enabled: true,
            event_reminders_enabled: true,
            sound_enabled: true,

            companion_enabled: true,
            companion_always_on_top: true,
            companion_scale: 3.0,
            companion_x: None,
            companion_y: None,
            companion_click_action: "poke".to_string(),
            companion_idle_animations: true,

            start_minimized: false,
            close_to_tray: true,
            effects_enabled: true,

            accent: "green".to_string(),
            text_size: "md".to_string(),
            density: "normal".to_string(),
            developer_mode: false,

            user_name: "".to_string(),
            repo_path: "".to_string(),
        }
    }
}

impl Settings {
    pub fn sanitized(mut self) -> Self {
        self.focus_minutes = self.focus_minutes.clamp(1, 180);
        self.short_break_minutes = self.short_break_minutes.clamp(1, 60);
        self.long_break_minutes = self.long_break_minutes.clamp(1, 120);
        self.sessions_before_long_break = self.sessions_before_long_break.clamp(1, 12);
        self.companion_scale = if self.companion_scale.is_finite() {
            self.companion_scale.round().clamp(2.0, 5.0)
        } else {
            3.0
        };
        self.user_name = self.user_name.trim().chars().take(40).collect();
        self.repo_path = self.repo_path.trim().chars().take(300).collect();
        if !["green", "amber", "rose"].contains(&self.accent.as_str()) {
            self.accent = "green".to_string();
        }
        if !["sm", "md", "lg"].contains(&self.text_size.as_str()) {
            self.text_size = "md".to_string();
        }
        if !["compact", "normal", "roomy"].contains(&self.density.as_str()) {
            self.density = "normal".to_string();
        }
        if !["poke", "open"].contains(&self.companion_click_action.as_str()) {
            self.companion_click_action = "poke".to_string();
        }
        self
    }
}

impl Settings {
    pub fn apply_patch(&mut self, patch: SettingsPatch) {
        if let Some(v) = patch.focus_minutes {
            self.focus_minutes = v;
        }
        if let Some(v) = patch.short_break_minutes {
            self.short_break_minutes = v;
        }
        if let Some(v) = patch.long_break_minutes {
            self.long_break_minutes = v;
        }
        if let Some(v) = patch.sessions_before_long_break {
            self.sessions_before_long_break = v;
        }
        if let Some(v) = patch.auto_start_breaks {
            self.auto_start_breaks = v;
        }
        if let Some(v) = patch.auto_start_focus {
            self.auto_start_focus = v;
        }
        if let Some(v) = patch.notifications_enabled {
            self.notifications_enabled = v;
        }
        if let Some(v) = patch.event_reminders_enabled {
            self.event_reminders_enabled = v;
        }
        if let Some(v) = patch.sound_enabled {
            self.sound_enabled = v;
        }
        if let Some(v) = patch.companion_enabled {
            self.companion_enabled = v;
        }
        if let Some(v) = patch.companion_always_on_top {
            self.companion_always_on_top = v;
        }
        if let Some(v) = patch.companion_scale {
            self.companion_scale = v;
        }
        if let Some(v) = patch.companion_x {
            self.companion_x = Some(v);
        }
        if let Some(v) = patch.companion_y {
            self.companion_y = Some(v);
        }
        if let Some(v) = patch.companion_click_action {
            self.companion_click_action = v;
        }
        if let Some(v) = patch.companion_idle_animations {
            self.companion_idle_animations = v;
        }
        if let Some(v) = patch.start_minimized {
            self.start_minimized = v;
        }
        if let Some(v) = patch.close_to_tray {
            self.close_to_tray = v;
        }
        if let Some(v) = patch.effects_enabled {
            self.effects_enabled = v;
        }
        if let Some(v) = patch.user_name {
            self.user_name = v;
        }
        if let Some(v) = patch.repo_path {
            self.repo_path = v;
        }
        if let Some(v) = patch.accent {
            self.accent = v;
        }
        if let Some(v) = patch.text_size {
            self.text_size = v;
        }
        if let Some(v) = patch.density {
            self.density = v;
        }
        if let Some(v) = patch.developer_mode {
            self.developer_mode = v;
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", default)]
pub struct SettingsPatch {
    pub focus_minutes: Option<u32>,
    pub short_break_minutes: Option<u32>,
    pub long_break_minutes: Option<u32>,
    pub sessions_before_long_break: Option<u32>,
    pub auto_start_breaks: Option<bool>,
    pub auto_start_focus: Option<bool>,
    pub notifications_enabled: Option<bool>,
    pub event_reminders_enabled: Option<bool>,
    pub sound_enabled: Option<bool>,
    pub companion_enabled: Option<bool>,
    pub companion_always_on_top: Option<bool>,
    pub companion_scale: Option<f64>,
    pub companion_x: Option<f64>,
    pub companion_y: Option<f64>,
    pub companion_click_action: Option<String>,
    pub companion_idle_animations: Option<bool>,
    pub start_minimized: Option<bool>,
    pub close_to_tray: Option<bool>,
    #[serde(alias = "crtEffectsEnabled")]
    pub effects_enabled: Option<bool>,
    pub repo_path: Option<String>,
    pub user_name: Option<String>,
    pub accent: Option<String>,
    pub text_size: Option<String>,
    pub density: Option<String>,
    pub developer_mode: Option<bool>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_are_sane() {
        let s = Settings::default();
        assert_eq!(s.focus_minutes, 25);
        assert_eq!(s.short_break_minutes, 5);
        assert_eq!(s.long_break_minutes, 15);
    }

    #[test]
    fn sanitizing_clamps_and_repairs_values() {
        let s = Settings {
            focus_minutes: 0,
            short_break_minutes: 9_999,
            companion_scale: f64::NAN,
            user_name: "  Arthur  ".into(),
            ..Settings::default()
        }
        .sanitized();

        assert_eq!(s.focus_minutes, 1);
        assert_eq!(s.short_break_minutes, 60);
        assert_eq!(s.companion_scale, 3.0);
        assert_eq!(s.user_name, "Arthur");
    }

    #[test]
    fn companion_scale_snaps_to_whole_numbers_between_two_and_five() {
        let low = Settings {
            companion_scale: 0.6,
            ..Settings::default()
        }
        .sanitized();
        assert_eq!(low.companion_scale, 2.0);

        let high = Settings {
            companion_scale: 7.7,
            ..Settings::default()
        }
        .sanitized();
        assert_eq!(high.companion_scale, 5.0);

        let exact = Settings {
            companion_scale: 3.0,
            ..Settings::default()
        }
        .sanitized();
        assert_eq!(exact.companion_scale, 3.0);
    }

    #[test]
    fn round_trips_through_json() {
        let original = Settings::default();
        let json = serde_json::to_string(&original).expect("encode");
        let decoded: Settings = serde_json::from_str(&json).expect("decode");
        assert_eq!(original, decoded);
    }

    #[test]
    fn commit_syncing_stays_off_until_a_repository_path_is_set() {
        assert_eq!(Settings::default().repo_path, "");
    }

    #[test]
    fn the_repository_path_is_trimmed_and_capped() {
        let s = Settings {
            repo_path: "  ~/Workspace/Wolf  ".into(),
            ..Settings::default()
        }
        .sanitized();
        assert_eq!(s.repo_path, "~/Workspace/Wolf");

        let long = Settings {
            repo_path: "x".repeat(500),
            ..Settings::default()
        }
        .sanitized();
        assert_eq!(long.repo_path.chars().count(), 300);
    }

    #[test]
    fn unknown_palette_and_comfort_values_fall_back_to_defaults() {
        let s = Settings {
            accent: "magenta".into(),
            text_size: "xl".into(),
            density: "huge".into(),
            ..Settings::default()
        }
        .sanitized();

        assert_eq!(s.accent, "green");
        assert_eq!(s.text_size, "md");
        assert_eq!(s.density, "normal");
        assert!(!s.developer_mode);
    }

    #[test]
    fn retired_cyan_and_neon_accents_return_to_green() {
        for retired in ["neon", "cyan"] {
            let s = Settings {
                accent: retired.into(),
                ..Settings::default()
            }
            .sanitized();
            assert_eq!(s.accent, "green");
        }
    }

    #[test]
    fn legacy_crt_key_is_read_into_the_effects_field() {
        let json = r#"{"crtEffectsEnabled": false}"#;
        let decoded: Settings = serde_json::from_str(json).expect("decode legacy blob");
        assert!(!decoded.effects_enabled);
    }

    #[test]
    fn effects_field_serializes_under_its_new_key() {
        let json = serde_json::to_value(Settings::default()).expect("encode");
        assert_eq!(json["effectsEnabled"], serde_json::json!(true));
        assert!(json.get("crtEffectsEnabled").is_none());
    }
}
