import { useMemo, useState } from "react";
import { Panel, PageHeader } from "../../components/ui";

interface Section {
  id: string;
  title: string;
  body: string[];
}

const SECTIONS: readonly Section[] = [
  {
    id: "start",
    title: "Getting started",
    body: [
      "Wolf is a local-first productivity companion. This is the free edition, which keeps the essentials: tasks, habits, a calendar with reminders, a focus timer, progress review, backups, and a silent companion.",
      "Everything you write stays on this machine. There are no accounts, no login, and no network calls at all.",
      "Pick a section in the sidebar or press a number key (1-9) to jump. The companion window can be dragged anywhere on screen.",
    ],
  },
  {
    id: "tasks",
    title: "Tasks",
    body: [
      "Tasks hold a title, optional notes, a priority, and an optional due date.",
      "Filter by status or priority and sort the list from the toolbar. Overdue tasks surface on the Today page.",
    ],
  },
  {
    id: "habits",
    title: "Habits",
    body: [
      "Habits track a target count per day or week. Tap the check to log progress; streaks and totals update live.",
      "Give each habit a colour so the Today grid stays readable at a glance.",
    ],
  },
  {
    id: "calendar",
    title: "Calendar",
    body: [
      "Add events with a start and end time. Reminders fire a desktop notification when enabled in Settings.",
      "Events can repeat daily, weekly, or monthly. Recurring events are derived at read time, so editing one occurrence is safe.",
    ],
  },
  {
    id: "focus",
    title: "Focus",
    body: [
      "Run a focus session with configurable work and break lengths. Sessions appear on the Progress page.",
      "Auto-start, long-break cadence, and notifications are all in Settings.",
    ],
  },
  {
    id: "progress",
    title: "Progress and review",
    body: [
      "The Progress page charts your focus minutes, habit streaks, and task activity so you can see momentum over time.",
      "The Review page reads a week or month back, pulling together what you finished, skipped, and planned.",
    ],
  },
  {
    id: "companion",
    title: "The companion",
    body: [
      "The draggable companion is a small wolf that lives on your screen. It reacts to what you do but stays silent: no chatter, no sound.",
      "Drag it anywhere, or click it to focus the main window. Its size and click behaviour are in Settings, Desktop.",
    ],
  },
  {
    id: "backup",
    title: "Backup and data",
    body: [
      "Settings, Backup can export your data as JSON and restore it later. Backups include tasks, habits, events, and focus sessions.",
      "The database lives under your config folder. It survives restarts and upgrades.",
    ],
  },
  {
    id: "launchers",
    title: "App launchers",
    body: [
      "Scripts under scripts/launchers install Wolf into your application bar on Linux, Windows, and macOS.",
      "Run WOLF.sh (Linux), WOLF.bat or WOLF.ps1 (Windows), or WOLF.command (macOS) once to create the shortcut.",
    ],
  },
  {
    id: "shortcuts",
    title: "Keyboard shortcuts",
    body: [
      "1-9 jump between sections. Ctrl/Cmd+K is a quick command hint. Esc closes any open dialog.",
      "Press ? in a section with a toolbar to see actions available there.",
    ],
  },
  {
    id: "upgrade",
    title: "About this edition",
    body: [
      "This is the free edition of Wolf, version 0.3.1. It focuses on the essentials and keeps everything local.",
      "Wolf v0.4.0 is coming soon: a bigger version with goals, a records vault, a journal, achievements, and a talking companion. Download it soon at scriptmonks.com.",
    ],
  },
];

export function ManualPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.body.some((line) => line.toLowerCase().includes(q)),
    );
  }, [query]);

  return (
    <div className="stack">
      <PageHeader
        title="Manual"
        subtitle="How every part of Wolf works. Offline, always current."
      />

      <Panel title="Find a topic">
        <input
          className="input"
          type="search"
          value={query}
          placeholder="Search the manual"
          aria-label="Search the manual"
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="row" style={{ marginTop: "var(--space-3)" }}>
          {filtered.map((section) => (
            <a key={section.id} className="chip" href={`#manual-${section.id}`}>
              {section.title}
            </a>
          ))}
        </div>
      </Panel>

      {filtered.length === 0 ? (
        <Panel title="No match">
          <p className="muted">Nothing matched "{query}". Try another word.</p>
        </Panel>
      ) : (
        filtered.map((section) => (
          <section key={section.id} id={`manual-${section.id}`}>
            <Panel title={section.title}>
              <div className="stack">
                {section.body.map((line, index) => (
                  <p key={index} className="muted">
                    {line}
                  </p>
                ))}
              </div>
            </Panel>
          </section>
        ))
      )}
    </div>
  );
}
