use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Countdown {
    pub id: String,
    pub label: String,
    pub target_date: String,
    pub current_value: i64,
    pub target_value: i64,
    pub completed_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewCountdown {
    pub label: String,
    pub target_date: String,
    #[serde(default)]
    pub target_value: Option<i64>,
    #[serde(default)]
    pub current_value: Option<i64>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CountdownUpdate {
    pub label: Option<String>,
    pub target_date: Option<String>,
    pub target_value: Option<i64>,
    pub current_value: Option<i64>,
}

impl Countdown {
    pub fn days_remaining(&self, today: &str) -> i64 {
        let target = match chrono::NaiveDate::parse_from_str(&self.target_date, "%Y-%m-%d") {
            Ok(d) => d,
            Err(_) => return 0,
        };
        let from = match chrono::NaiveDate::parse_from_str(today, "%Y-%m-%d") {
            Ok(d) => d,
            Err(_) => return 0,
        };
        (target - from).num_days()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample(target_date: &str) -> Countdown {
        Countdown {
            id: "c1".into(),
            label: "Ship 0.2.0".into(),
            target_date: target_date.into(),
            current_value: 2,
            target_value: 5,
            completed_at: None,
            created_at: "2026-10-01T00:00:00Z".into(),
            updated_at: "2026-10-01T00:00:00Z".into(),
        }
    }

    #[test]
    fn days_remaining_counts_forward_across_a_month_boundary() {
        assert_eq!(sample("2026-11-01").days_remaining("2026-10-05"), 27);
    }

    #[test]
    fn days_remaining_is_negative_once_the_date_has_passed() {
        assert_eq!(sample("2026-09-30").days_remaining("2026-10-05"), -5);
    }

    #[test]
    fn days_remaining_is_zero_on_the_day_itself() {
        assert_eq!(sample("2026-10-05").days_remaining("2026-10-05"), 0);
    }

    #[test]
    fn an_unparseable_date_does_not_panic() {
        assert_eq!(sample("not-a-date").days_remaining("2026-10-05"), 0);
    }
}
