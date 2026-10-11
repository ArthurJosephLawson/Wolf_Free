use serde::{Deserialize, Serialize};

use crate::error::{WolfError, WolfResult};

pub const XP_PER_TASK: i64 = 10;
pub const XP_TASK_ON_TIME_BONUS: i64 = 5;
pub const XP_PER_HABIT: i64 = 5;
pub const XP_PER_FOCUS_SESSION: i64 = 25;
pub const XP_PER_COUNTDOWN: i64 = 15;

pub fn cumulative_xp_for_level(level: i64) -> i64 {
    if level <= 1 {
        return 0;
    }
    50i64
        .checked_mul(level)
        .and_then(|value| value.checked_mul(level - 1))
        .unwrap_or(i64::MAX)
}

pub fn level_for(total: i64) -> i64 {
    let total = total.max(0);
    let mut level = 1;
    while level < 1_000_000 && cumulative_xp_for_level(level + 1) <= total {
        level += 1;
    }
    level
}

pub fn xp_into_level(total: i64) -> i64 {
    total.max(0) - cumulative_xp_for_level(level_for(total))
}

pub fn xp_for_next_level(total: i64) -> i64 {
    cumulative_xp_for_level(level_for(total) + 1) - total.max(0)
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum XpSource {
    Task,
    Habit,
    Focus,
    Countdown,
}

impl XpSource {
    pub fn as_str(&self) -> &'static str {
        match self {
            XpSource::Task => "task",
            XpSource::Habit => "habit",
            XpSource::Focus => "focus",
            XpSource::Countdown => "countdown",
        }
    }

    pub fn parse(value: &str) -> WolfResult<Self> {
        match value {
            "task" => Ok(XpSource::Task),
            "habit" => Ok(XpSource::Habit),
            "focus" => Ok(XpSource::Focus),
            "countdown" => Ok(XpSource::Countdown),
            other => Err(WolfError::internal(format!(
                "Stored XP source `{other}` is not one Wolf knows."
            ))),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct XpEvent {
    pub id: String,
    pub source_kind: XpSource,
    pub source_id: String,
    pub amount: i64,
    pub awarded_at: String,
    pub day: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct XpSummary {
    pub total: i64,
    pub lifetime_total: i64,
    pub level: i64,
    pub xp_into_level: i64,
    pub xp_for_next_level: i64,
}

impl Default for XpSummary {
    fn default() -> Self {
        Self {
            total: 0,
            lifetime_total: 0,
            level: 1,
            xp_into_level: 0,
            xp_for_next_level: cumulative_xp_for_level(2),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_source_round_trips_through_its_wire_name() {
        for source in [
            XpSource::Task,
            XpSource::Habit,
            XpSource::Focus,
            XpSource::Countdown,
        ] {
            assert_eq!(XpSource::parse(source.as_str()).unwrap(), source);
        }
    }

    #[test]
    fn an_unknown_stored_source_is_reported_not_ignored() {
        assert!(XpSource::parse("carrier_pigeon").is_err());
    }

    #[test]
    fn cumulative_xp_follows_the_flat_ramp() {
        assert_eq!(cumulative_xp_for_level(1), 0);
        assert_eq!(cumulative_xp_for_level(2), 100);
        assert_eq!(cumulative_xp_for_level(3), 300);
        assert_eq!(cumulative_xp_for_level(4), 600);
        assert_eq!(cumulative_xp_for_level(5), 1000);
        assert_eq!(cumulative_xp_for_level(0), 0);
        assert_eq!(cumulative_xp_for_level(-3), 0);
    }

    #[test]
    fn level_boundaries_land_exactly_on_each_threshold() {
        for (total, expected) in [
            (0, 1),
            (1, 1),
            (99, 1),
            (100, 2),
            (299, 2),
            (300, 3),
            (599, 3),
            (600, 4),
            (999, 4),
            (1000, 5),
        ] {
            assert_eq!(level_for(total), expected, "total {total}");
        }
    }

    #[test]
    fn level_never_decreases_as_xp_grows() {
        let mut previous = 1;
        for total in 0..5_000 {
            let level = level_for(total);
            assert!(
                level >= previous,
                "level dropped from {previous} to {level} at {total} XP"
            );
            previous = level;
        }
        assert_eq!(level_for(5_000), 10);
    }

    #[test]
    fn into_and_next_always_split_the_next_level_cost() {
        for total in 0..5_000 {
            let level = level_for(total);
            let cost = cumulative_xp_for_level(level + 1) - cumulative_xp_for_level(level);
            assert_eq!(
                xp_into_level(total) + xp_for_next_level(total),
                cost,
                "total {total} at level {level}"
            );
            assert!(xp_into_level(total) < cost);
            assert!(xp_for_next_level(total) > 0);
        }
    }

    #[test]
    fn negative_totals_are_treated_as_a_fresh_account() {
        assert_eq!(level_for(-500), 1);
        assert_eq!(xp_into_level(-500), 0);
        assert_eq!(xp_for_next_level(-500), cumulative_xp_for_level(2));
    }

    #[test]
    fn a_default_summary_starts_at_level_one() {
        let summary = XpSummary::default();
        assert_eq!(summary.level, 1);
        assert_eq!(summary.lifetime_total, 0);
        assert_eq!(summary.xp_into_level, 0);
        assert_eq!(summary.xp_for_next_level, cumulative_xp_for_level(2));
    }
}
