ALTER TABLE commit_logs ADD COLUMN source  TEXT    NOT NULL DEFAULT 'manual';
ALTER TABLE commit_logs ADD COLUMN git_sha TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_commit_logs_git_sha
    ON commit_logs(git_sha) WHERE git_sha IS NOT NULL;

CREATE TABLE IF NOT EXISTS ignored_commits (
    sha        TEXT PRIMARY KEY NOT NULL,
    ignored_at TEXT NOT NULL
);
