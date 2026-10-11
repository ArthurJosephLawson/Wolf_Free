use std::process::Command;

use crate::error::{WolfError, WolfResult};

const RECORD: char = '\x1e';
const FIELD: char = '\x1f';

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GitCommit {
    pub sha: String,
    pub day: String,
    pub message: String,
    pub files_changed: i64,
    pub lines_added: i64,
    pub lines_removed: i64,
}

pub fn read_git_log(path: &str, limit: u32) -> WolfResult<Vec<GitCommit>> {
    let repo = path.trim();
    if repo.is_empty() {
        return Err(WolfError::invalid(
            "Set a repository path in Settings before syncing commits.",
        ));
    }

    let output = Command::new("git")
        .arg("-C")
        .arg(repo)
        .arg("log")
        .arg("--no-merges")
        .arg(format!("--max-count={limit}"))
        .arg("--numstat")
        .arg("--date=format-local:%Y-%m-%d")
        .arg("--pretty=format:%x1e%H%x1f%ad%x1f%s")
        .output()
        .map_err(|reason| {
            WolfError::invalid(format!(
                "Wolf could not run git ({reason}). Install git and try again."
            ))
        })?;

    if !output.status.success() {
        let detail = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(WolfError::invalid(format!(
            "Wolf could not read commits from \"{repo}\": {detail}"
        )));
    }

    Ok(parse_git_log(&String::from_utf8_lossy(&output.stdout)))
}

pub fn parse_git_log(raw: &str) -> Vec<GitCommit> {
    raw.split(RECORD)
        .filter_map(|chunk| {
            let mut lines = chunk.lines();
            let header = lines.next()?;
            let mut fields = header.split(FIELD);
            let sha = fields.next()?.trim().to_string();
            let day = fields.next()?.trim().to_string();
            let message = fields.next().unwrap_or("").trim().to_string();
            if sha.is_empty() || day.is_empty() {
                return None;
            }

            let mut files_changed = 0;
            let mut lines_added = 0;
            let mut lines_removed = 0;
            for line in lines {
                let mut parts = line.split('\t');
                let added = parts.next().unwrap_or("");
                let removed = parts.next().unwrap_or("");
                if added.is_empty() || removed.is_empty() {
                    continue;
                }
                files_changed += 1;
                lines_added += parse_count(added);
                lines_removed += parse_count(removed);
            }

            Some(GitCommit {
                sha,
                day,
                message,
                files_changed,
                lines_added,
                lines_removed,
            })
        })
        .collect()
}

fn parse_count(raw: &str) -> i64 {
    raw.trim().parse::<i64>().unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn fixture() -> String {
        let mut raw = String::new();
        raw.push(RECORD);
        raw.push_str("aaaa1111bbbb2222");
        raw.push(FIELD);
        raw.push_str("2026-10-06");
        raw.push(FIELD);
        raw.push_str("feat(progress): add the thing");
        raw.push('\n');
        raw.push_str("41\t1\tsrc-tauri/src/models/xp.rs\n");
        raw.push_str("4\t1\tsrc/app/nav.ts\n");
        raw.push('\n');
        raw.push(RECORD);
        raw.push_str("cccc3333dddd4444");
        raw.push(FIELD);
        raw.push_str("2026-10-05");
        raw.push(FIELD);
        raw.push_str("chore: bundle fonts");
        raw.push('\n');
        raw.push_str("-\t-\tsrc/assets/fonts/VT323-Regular.ttf\n");
        raw.push('\n');
        raw
    }

    #[test]
    fn a_record_splits_into_sha_day_message_and_counts() {
        let commits = parse_git_log(&fixture());
        assert_eq!(commits.len(), 2);
        assert_eq!(commits[0].sha, "aaaa1111bbbb2222");
        assert_eq!(commits[0].day, "2026-10-06");
        assert_eq!(commits[0].message, "feat(progress): add the thing");
        assert_eq!(commits[0].files_changed, 2);
        assert_eq!(commits[0].lines_added, 45);
        assert_eq!(commits[0].lines_removed, 2);
    }

    #[test]
    fn a_binary_file_counts_as_a_changed_file_with_no_line_delta() {
        let commits = parse_git_log(&fixture());
        assert_eq!(commits[1].files_changed, 1);
        assert_eq!(commits[1].lines_added, 0);
        assert_eq!(commits[1].lines_removed, 0);
    }

    #[test]
    fn nothing_in_means_nothing_out() {
        assert!(parse_git_log("").is_empty());
        assert!(parse_git_log("\n").is_empty());
    }

    #[test]
    fn a_malformed_record_is_dropped_rather_than_breaking_the_rest() {
        let mut raw = String::new();
        raw.push(RECORD);
        raw.push('\n');
        raw.push_str(&fixture());
        let commits = parse_git_log(&raw);
        assert_eq!(commits.len(), 2);
    }

    #[test]
    fn an_empty_path_is_refused_before_git_runs() {
        let err = read_git_log("   ", 100).unwrap_err();
        assert_eq!(err.kind(), "invalid");
        assert!(err.to_string().contains("repository path"));
    }

    #[test]
    fn a_folder_that_is_not_a_repository_is_explained() {
        let dir: PathBuf =
            std::env::temp_dir().join(format!("wolf-gitlog-{}", uuid::Uuid::new_v4().simple()));
        std::fs::create_dir_all(&dir).expect("create scratch folder");
        let err = read_git_log(dir.to_str().unwrap_or(""), 100).unwrap_err();
        let _ = std::fs::remove_dir_all(&dir);
        assert_eq!(err.kind(), "invalid");
        assert!(err.to_string().contains("could not read commits"));
    }

    #[test]
    fn this_checkout_reads_as_real_commits() {
        let commits = read_git_log(".", 5).expect("the repository is readable");
        assert!(!commits.is_empty());
        for commit in &commits {
            assert_eq!(commit.sha.len(), 40, "full sha from %H");
            assert_eq!(commit.day.len(), 10, "YYYY-MM-DD from %ad");
            assert!(!commit.message.is_empty());
        }
    }
}
