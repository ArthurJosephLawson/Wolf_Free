pub mod backup;
pub mod calendar;
pub mod commit;
pub mod countdown;
pub mod desktop;
pub mod focus;
pub mod habits;
pub mod settings;
pub mod tasks;
pub mod xp;

use chrono::Datelike;

pub fn today() -> chrono::NaiveDate {
    chrono::Local::now().date_naive()
}

pub fn local_now() -> String {
    chrono::Local::now().format("%Y-%m-%dT%H:%M").to_string()
}

pub fn week_start(date: chrono::NaiveDate) -> String {
    let weekday = date.weekday().num_days_from_monday() as i64;
    (date - chrono::Duration::days(weekday))
        .format("%Y-%m-%d")
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn week_start_is_monday() {
        assert_eq!(
            week_start(chrono::NaiveDate::from_ymd_opt(2026, 9, 28).unwrap()),
            "2026-09-28"
        );

        assert_eq!(
            week_start(chrono::NaiveDate::from_ymd_opt(2026, 9, 30).unwrap()),
            "2026-09-28"
        );

        assert_eq!(
            week_start(chrono::NaiveDate::from_ymd_opt(2026, 10, 4).unwrap()),
            "2026-09-28"
        );

        assert_eq!(
            week_start(chrono::NaiveDate::from_ymd_opt(2026, 10, 5).unwrap()),
            "2026-10-05"
        );
    }
}
