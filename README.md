# Wolf — Free Edition

Version 0.3.1 — an early prototype, not a finished release. Expect rough edges
and changes without notice. Linux only.

> **Wolf v0.4.0 is coming soon.** A bigger version with goals, a records vault,
> a journal and more. Download it soon at
> [scriptmonks.com](https://scriptmonks.com).

A local-first productivity companion that lives on your desktop. Tasks,
habits, calendar and a focus timer — with a silent wolf that reacts to what you
are doing.

Everything is stored in a SQLite database on your own machine. Wolf makes no
network requests at all.

## What it does

**Tasks** — capture, prioritise, and filter by day, project or status. Tasks
without a due date are not lost, they just sort last.

**Habits** — daily, weekday, or weekly frequencies, with current and longest
streaks and a 28-day completion grid. Undoing a day recalculates the streak
correctly rather than pretending it never happened.

**Calendar** — events with reminders, and month and day views. Events repeat:
daily, on weekdays, or weekly, and the pattern you set is the pattern you see.
The reminder is delivered through your desktop's notification service at a lead
time you set per event.

**Focus** — a Pomodoro-style timer with configurable block and break lengths,
and an option to start the next block or break by itself. Each completed session
is recorded, and the sparkline shows the last seven days of minutes. Days are
grouped by _your local midnight_, not by UTC, so a session that ends just after
midnight lands on the right day.

**Progress** — charts for your focus minutes, habit streaks and task activity,
plus countdowns to the dates that matter and a commit log where you record what
you shipped.

**Review** — one page for the week: focus minutes, sessions completed, plus what
is overdue, what is due today, and which habits are still open.

**Settings** — accent color in green, amber or rose; text size, spacing and
motion and effects; backup export and import; pet behavior (what a click does,
whether idle animations play).

**Manual** — a built-in guide to every surface, searchable and offline.

**The companion** — a draggable wolf that reacts to what you do but stays
silent: no chatter, no sound. Give each habit a colour so the Today grid stays
readable at a glance.

## What is not here

This free edition leaves out the features reserved for the coming v0.4.0:
accounts and login, profiles, the records vault, goals, the journal, quick
to-dos, achievements, the consistency grid, levels and the talking companion.
Wolf v0.4.0 brings them back — bigger — at
[scriptmonks.com](https://scriptmonks.com).

## Keyboard shortcuts

Run `npm run dev` for a live window. Then:

- Digit keys `1`–`9` jump between sections.
- `Ctrl`/`Cmd`+`K` shows a quick command hint.
- `Esc` closes any open dialog.

## Install

```bash
git clone https://github.com/ArthurJosephLawson/Wolf_Free
cd Wolf_Free
npm install
npm run dev
```

To build installers (`.deb` and AppImage):

```bash
npm run build
```

These land in `src-tauri/target/release/bundle/`.

To add Wolf to your desktop's application menu (`.desktop` entry on Linux), run
the launcher script:

```bash
bash scripts/launchers/WOLF.sh
```

Windows equivalents live in `scripts/launchers/` (`WOLF.bat`, `WOLF.ps1`).

### Requirements

- Node 24 or newer
- A Rust toolchain from 1.82
- On Debian or Ubuntu, Tauri's system libraries:

  ```bash
  sudo apt install libwebkit2gtk-4.1-dev build-essential curl \
    wget file libxdo-dev libssl-dev librsvg2-dev libayatana-appindicator3-dev \
    patchelf
  ```

The Tauri dependencies are listed in full in [CONTRIBUTING.md](CONTRIBUTING.md).

## Privacy

- All your data — tasks, habits, events and focus sessions — lives in a single
  SQLite file in your platform's user data directory. Nothing leaves the
  machine.
- There are no accounts and no passwords. Wolf never asks you to sign in.
- Wolf makes no network requests. There is nothing to configure, and no address
  that anything could be sent to.

See [manual.md](manual.md) for the full user guide.

## Development

```bash
npm run verify       # typecheck, lint, vitest, cargo check, cargo test
npm run dev:web      # frontend only, in a browser, against a mock IPC bridge
npm run test         # 238 frontend tests
npm run rust:test    # 141 Rust tests
```

Neither suite needs a display, a network connection, or a database file. The Rust
tests run the real migrations against in-memory SQLite.

There is a test that parses the frontend's `invoke` calls and the Rust
command list and fails if the two disagree on a command name or an argument key.
Tauri resolves both at runtime, so without it a renamed command is a
production-only failure.

## Architecture

A React and TypeScript frontend over a Rust backend, with SQLite in between. The
frontend never calls Tauri directly; it goes through a service layer, which is
what makes the IPC contract testable.

- [`documents/internal/ARCHITECTURE.md`](documents/internal/ARCHITECTURE.md) — how the pieces fit together.
- [`documents/internal/DEVELOPMENT.md`](documents/internal/DEVELOPMENT.md) — where new code should go.

## Credits

Wolf is written and maintained by Arthur Joseph Lawson (Monk_Mango), for
ScriptMonks.

- Instagram, company: [@monk_mango](https://instagram.com/monk_mango)
- GitHub, developer: [@ArthurJosephLawson](https://github.com/ArthurJosephLawson)
- GitHub, company: [@Script_monks](https://github.com/Script_monks)

The third-party software it is built on, and the fonts it ships, are listed in
[CREDITS.md](CREDITS.md).

## License

MIT. Copyright (c) 2026 ScriptMonks (Arthur Joseph Lawson / Monk_Mango).
See [LICENSE](LICENSE).
