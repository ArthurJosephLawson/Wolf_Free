ALTER TABLE calendar_events ADD COLUMN recurrence TEXT NOT NULL DEFAULT 'none'
    CHECK (recurrence IN ('none', 'daily', 'weekdays', 'weekly'));
