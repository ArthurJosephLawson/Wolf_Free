use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CommitLog {
    pub id: String,
    pub committed_on: String,
    pub message: String,
    pub files_changed: i64,
    pub lines_added: i64,
    pub lines_removed: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewCommitLog {
    pub committed_on: String,
    pub message: String,
    #[serde(default)]
    pub files_changed: Option<i64>,
    #[serde(default)]
    pub lines_added: Option<i64>,
    #[serde(default)]
    pub lines_removed: Option<i64>,
}

impl CommitLog {
    pub fn net_lines(&self) -> i64 {
        self.lines_added - self.lines_removed
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> CommitLog {
        CommitLog {
            id: "a1".into(),
            committed_on: "2026-10-05".into(),
            message: "refactor: remove local assistant".into(),
            files_changed: 45,
            lines_added: 51,
            lines_removed: 3394,
            created_at: "2026-10-05T10:00:00Z".into(),
        }
    }

    #[test]
    fn net_lines_can_be_negative_for_a_deletion_heavy_commit() {
        assert_eq!(sample().net_lines(), -3343);
    }
}
