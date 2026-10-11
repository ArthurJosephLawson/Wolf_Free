CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY NOT NULL,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
