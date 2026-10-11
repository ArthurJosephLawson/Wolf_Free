CREATE TABLE xp_events_new (
    id          TEXT    PRIMARY KEY NOT NULL,
    source_kind TEXT    NOT NULL CHECK (source_kind IN ('task', 'habit', 'focus', 'countdown')),
    source_id   TEXT    NOT NULL,
    amount      INTEGER NOT NULL CHECK (amount > 0),
    awarded_at  TEXT    NOT NULL,
    day         TEXT    NOT NULL,
    UNIQUE (source_kind, source_id)
);

INSERT INTO xp_events_new SELECT id, source_kind, source_id, amount, awarded_at, day FROM xp_events;

DROP TABLE xp_events;

ALTER TABLE xp_events_new RENAME TO xp_events;

CREATE INDEX IF NOT EXISTS idx_xp_events_day    ON xp_events (day);
CREATE INDEX IF NOT EXISTS idx_xp_events_awarded ON xp_events (awarded_at DESC);
