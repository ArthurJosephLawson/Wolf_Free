CREATE TABLE IF NOT EXISTS xp_events (
    id          TEXT    PRIMARY KEY NOT NULL,
    source_kind TEXT    NOT NULL CHECK (source_kind IN ('task', 'habit', 'focus')),
    source_id   TEXT    NOT NULL,
    amount      INTEGER NOT NULL CHECK (amount > 0),
    awarded_at  TEXT    NOT NULL,
    day         TEXT    NOT NULL,
    UNIQUE (source_kind, source_id)
);

CREATE INDEX IF NOT EXISTS idx_xp_events_day    ON xp_events (day);
CREATE INDEX IF NOT EXISTS idx_xp_events_awarded ON xp_events (awarded_at DESC);

CREATE TABLE IF NOT EXISTS countdowns (
    id            TEXT    PRIMARY KEY NOT NULL,
    label         TEXT    NOT NULL CHECK (length(trim(label)) > 0),
    target_date   TEXT    NOT NULL,
    current_value INTEGER NOT NULL DEFAULT 0 CHECK (current_value >= 0),
    target_value  INTEGER NOT NULL DEFAULT 1 CHECK (target_value > 0),
    completed_at  TEXT,
    created_at    TEXT    NOT NULL,
    updated_at    TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_countdowns_target ON countdowns (target_date);

CREATE TABLE IF NOT EXISTS commit_logs (
    id            TEXT    PRIMARY KEY NOT NULL,
    committed_on  TEXT    NOT NULL,
    message       TEXT    NOT NULL CHECK (length(trim(message)) > 0),
    files_changed INTEGER NOT NULL DEFAULT 0 CHECK (files_changed >= 0),
    lines_added   INTEGER NOT NULL DEFAULT 0 CHECK (lines_added >= 0),
    lines_removed INTEGER NOT NULL DEFAULT 0 CHECK (lines_removed >= 0),
    created_at    TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_commit_logs_day ON commit_logs (committed_on DESC);