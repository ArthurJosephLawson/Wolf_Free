PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tasks (
    id           TEXT    PRIMARY KEY NOT NULL,
    title        TEXT    NOT NULL CHECK (length(trim(title)) > 0),
    description  TEXT    NOT NULL DEFAULT '',
    completed    INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
    priority     INTEGER NOT NULL DEFAULT 2 CHECK (priority BETWEEN 0 AND 3),
    due_date     TEXT,
    created_at   TEXT    NOT NULL,
    updated_at   TEXT    NOT NULL,
    completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks (completed);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date  ON tasks (due_date);

CREATE TABLE IF NOT EXISTS habits (
    id          TEXT    PRIMARY KEY NOT NULL,
    name        TEXT    NOT NULL CHECK (length(trim(name)) > 0),
    description TEXT    NOT NULL DEFAULT '',
    frequency   TEXT    NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekdays', 'weekly')),
    target_per_period INTEGER NOT NULL DEFAULT 1 CHECK (target_per_period > 0),
    color       TEXT    NOT NULL DEFAULT 'green',
    created_at  TEXT    NOT NULL,
    archived    INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_habits_archived ON habits (archived);

CREATE TABLE IF NOT EXISTS habit_completions (
    id           TEXT PRIMARY KEY NOT NULL,
    habit_id     TEXT NOT NULL REFERENCES habits (id) ON DELETE CASCADE,
    completed_at TEXT NOT NULL,
    UNIQUE (habit_id, completed_at)
);

CREATE INDEX IF NOT EXISTS idx_habit_completions_habit ON habit_completions (habit_id, completed_at DESC);

CREATE TABLE IF NOT EXISTS calendar_events (
    id                TEXT    PRIMARY KEY NOT NULL,
    title             TEXT    NOT NULL CHECK (length(trim(title)) > 0),
    description       TEXT    NOT NULL DEFAULT '',
    start_time        TEXT    NOT NULL,
    end_time          TEXT    NOT NULL,
    all_day           INTEGER NOT NULL DEFAULT 0 CHECK (all_day IN (0, 1)),
    reminder_minutes  INTEGER,
    notified_at       TEXT,
    created_at        TEXT    NOT NULL,
    updated_at        TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_start ON calendar_events (start_time);

CREATE TABLE IF NOT EXISTS focus_sessions (
    id               TEXT    PRIMARY KEY NOT NULL,
    started_at       TEXT    NOT NULL,
    ended_at         TEXT,
    duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
    completed        INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
    kind             TEXT    NOT NULL DEFAULT 'focus' CHECK (kind IN ('focus', 'short_break', 'long_break'))
);

CREATE INDEX IF NOT EXISTS idx_focus_started ON focus_sessions (started_at DESC);
