# Wolf — User Manual

Free Edition, version 0.3.1.

Wolf is a local-first productivity companion. Everything you write stays on
your own machine, in a SQLite database. Wolf makes no network requests at all.

> **Wolf v0.4.0 is coming soon.** A bigger version with goals, a records vault,
> a journal and more. Download it soon at
> [scriptmonks.com](https://scriptmonks.com).

## 1. Getting started

1. Install the app. Either build it from source (see
   [README.md](README.md)) or run a released installer.
2. Launch Wolf. The main window opens with the sidebar on the left and the
   companion wolf on your desktop.
3. Pick a section in the sidebar, or press a digit key to jump. The companion
   can be dragged anywhere on screen.

Wolf keeps all state in one SQLite file under your platform's user data
directory. There are no accounts, no login, and nothing to sync.

## 2. Keyboard shortcuts

- `1`–`9` — jump between sections.
- `Ctrl`/`Cmd`+`K` — show a quick command hint.
- `Esc` — close any open dialog.

## 3. Tasks

Open **Tasks**. Each task holds a title, optional notes, a priority, and an
optional due date.

- **Add** a task from the toolbar.
- **Complete** it with the checkbox; completed tasks move out of the way.
- **Filter** by status or priority, and **sort** the list from the toolbar.
- Overdue tasks surface on the **Today** page, so nothing slips.

Tasks without a due date are not lost — they just sort last.

## 4. Habits

Open **Habits**. A habit tracks a target count per day or week.

- Tap the check to log progress; the current and longest streaks update live.
- The 28-day grid shows recent completions. Give each habit a colour so the
  Today grid stays readable.
- Undoing a day recalculates the streak correctly rather than pretending it
  never happened.

## 4. Calendar

Open **Calendar**. Add events with a start and end time, and month and day
views.

- **Reminders** fire a desktop notification at a lead time you set per event,
  when notifications are enabled in Settings.
- **Recurrence** — events can repeat daily, weekly, or on weekdays. The pattern
  you set is the pattern you see; recurring events are derived at read time, so
  editing one occurrence is safe.

## 4. Focus

Open **Focus** for a Pomodoro-style timer.

- Set block and break lengths in **Settings → Focus timer**.
- Optionally start the next block or break by itself.
- Each completed session is recorded. The sparkline shows the last seven days
  of minutes. Days are grouped by _your local midnight_, not by UTC.

## 6. Progress

Open **Progress** for charts: focus minutes, habit streaks, and task activity,
plus countdowns to the dates that matter and a commit log where you record what
you shipped.

Point the commit-log sync at a folder in **Settings** to read real Git commits.

## 7. Review

Open **Review** for one page covering the week: focus minutes, sessions
completed, what is overdue, what is due today, and which habits are still open.

## 8. The companion

The draggable companion is a small wolf that lives on your screen.

- **Drag** it anywhere.
- **Click** it to focus the main window (or whatever you chose).
- It reacts to what you do but stays **silent** in this edition: no chatter and
  no sound.

Its size and click behaviour live in **Settings → Desktop**.

## 9. Settings

- **Profile** — your name, used in greetings, and the repository path for
  commit sync. Never sent anywhere.
- **Focus timer** — work and break lengths, long-break cadence, auto-start.
- **Desktop** — companion size, click action, idle animations, tray behaviour.
- **Display** — motion and effects, accent colour, text size, spacing.
- **Notifications** — desktop notifications and event reminders.
- **Backup** — export and import your data.
- **About** — version, credits, and this handbook.

## 10. Backup and data

**Settings → Backup** can export your data as JSON and restore it later.
Backups include tasks, habits, events, focus sessions, and settings.

The database lives under your config folder and survives restarts and
upgrades. Keep your own copies if the data matters to you.

## 11. App launchers

Scripts under `scripts/launchers/` install Wolf into your application bar:

- **Linux** — `bash scripts/launchers/WOLF.sh`
- **Windows** — `WOLF.bat` or `WOLF.ps1`
- **macOS** — `WOLF.command`

Run one once to create the shortcut.

## 12. About this edition

This is the free edition of Wolf, version 0.3.1. It focuses on the essentials
and keeps everything local. It leaves out the features reserved for the coming
v0.4.0: accounts and login, profiles, the records vault, goals, the journal,
quick to-dos, achievements, the consistency grid, levels, and the talking
companion.

Wolf v0.4.0 brings them back — bigger — at
[scriptmonks.com](https://scriptmonks.com).
