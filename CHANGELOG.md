# Changelog

All notable changes to Wolf are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.1] - 2026-10-10

**The free edition.** A trimmed build of Wolf that keeps the essentials —
tasks, habits, calendar and reminders, the focus timer, progress and review,
the manual, settings, backup, and a silent companion — and drops the features
reserved for the coming v0.4.0. The sign-in window, profiles, the encrypted
vault, goals, the journal and daily check-ins, the quick to-do scratchpad,
achievements, the consistency grid, levels and the talking companion are all
removed. A banner and footer point to Wolf v0.4.0, coming soon at
scriptmonks.com. Everything stays local; there are no accounts and no network
calls.

### Changed

- Settings drops the developer-mode diagnostics panel and the sound-effects
  toggle.
- The title bar shows the edition instead of an account avatar and XP bar.
- The companion is silent: no speech bubble, no sound.

### Removed

- Accounts, sign-in window, session handling, and per-user profiles.
- The encrypted records vault.
- Goals, journal entries, daily logs, and the scratch-pad to-do list.
- Achievements, the consistency grid, and XP in the title bar.
- Companion speech phrases and synthesized sound effects.

## [0.4.0] - 2026-10-10

**Multiple accounts, your face, and more of the day recorded.** Sign-in and
sign-up run in their own window; each account gets its own database, profile
and encrypted vault. The vault's secrets reveal for ten seconds, then fade.
Your profile picture and title appear in the titlebar, and the companion greets
you by title. Goals, a journal with daily check-ins, a scratch-pad to-do list,
achievements and a six-month consistency grid round out tracking, with sound on
the events that earn XP.

### Added

- **Accounts and sign-in.** A separate, non-resizable sign-in window handles
  register and login using the account password (Argon2-hashed); the session
  persists and auto-logs back in. The main window stays hidden until a user is
  present. Each account owns its own database; the first account adopts the
  existing `wolf.db`.
- **Profiles.** Display name, title (Captain, Master, Sir, Chief, Commander),
  bio and a 256px avatar, drawn from an uploaded image or typed initials. The
  titlebar shows the signed-in account instead of the wolf emblem.
- **An encrypted vault.** Records store a label, kind, username, URL, notes and
  a secret. The secret is AES-256-GCM encrypted under a key derived from your
  account password, and never stored in the clear; it reveals for ten seconds
  on request, then hides. Changing your password re-encrypts everything.
- **Companion speech and sound.** The wolf reacts to signals with phrases and
  calls you by your profile title; poke, focus, habit and countdown events play
  short synthesized tones through a settings-toggle (sound effects on by
  default). Dragging is now pointer-captured and far less likely to drop.
- **Goals.** A page for the things bigger than a task: title, optional target
  date and notes, and progress steered in ten-point steps to 100%. A goal at
  100% records its completion; reopen it and the stamp clears.
- **A journal.** Entries with a date, optional title and free body, plus a
  daily check-in that stores a mood (great, good, neutral, low, rough) and
  optional notes for any day.
- **A scratch-pad to-do list.** Quick notes with no due dates, a done state, a
  "clear finished" sweep, and open items sorted first.
- **Achievements.** Twelve badges computed from real stats (tasks, habit
  streaks, focus sessions, level, vault, journal, goals, countdowns), unlocked
  once and persisted.
- **A consistency grid.** Six months of days across the top of Today, shaded by
  how many XP events landed each day, with an active-day count.
- **XP in the titlebar.** Level and progress-to-next fill sit next to the
  account avatar, in addition to the Level panel on Today.
- **Three migrations** (`0007_vault`, `0008_extras`) carrying the new tables;
  the database migrates on open.

### Changed

- **The primary accent is neon green** (`#39ff14`), with `--primary-dim`
  derived; cyan is retired, amber and rose remain alternates. Contrast tests
  cover the new hue.
- **The companion window** no longer uses the old window-drag shim; pointer
  capture starts and releases the drag on the interaction itself.
- **Home** gained the consistency grid and achievements panel; the titlebar
  gained the account avatar and XP fill.

## [0.3.0] - 2026-10-10

**Identity and interface rewrite.** The pixel-vintage look is gone; the app now
sits on a token-based dark design system with a vector wolf identity, while the
companion sprite itself stays pixel art.

### Added

- **A token-backed design system.** `theme.css` keeps the tokens, `globals.css`
  the primitives it builds: panels, page headers, buttons, inputs, chips, lists,
  stats, progress, toasts and modals. Text runs 14/15/17 px in Inter and
  JetBrains Mono; spacing comes in compact, normal and roomy densities.
- **A vector wolf brand mark** (`src/assets/brand/wolf-mark.svg`) and a
  pure-JavaScript rasterizer (`scripts/brand/generate-icons.mjs`) that
  regenerates every window, tray and favicon PNG plus the mark's path data. No
  image library or external binary involved.
- **A 22-icon stroke icon set** and a vector `Logo`, replacing the pixel glyphs
  in the titlebar, sidebar and controls.
- **Motion and effects settings**, turning animations and transitions on and
  off. Old settings files written with `crtEffectsEnabled` still load and map
  to the new field.
- **Accents cyan, amber and rose** (the `neon` accent is retired), plus an
  About/Credits block in Settings showing the app's handles and stack.
- **Contrast expectations encoded as tests**: TEXT at 4.5, UI at 3, and
  INK-on-FILL at 4.5 (`src/styles/theme.contrast.test.ts`).
- **A browser mock IPC bridge** (`src/dev/mockInvoke.ts`) so `npm run dev:web`
  renders every real screen from fixtures without the Rust layer. It is guarded
  by `import.meta.env.DEV`, dropped from production builds, and kept honest by
  `mockInvoke.test.ts`, which fails if a command the frontend calls has no mock.

### Changed

- **Every screen moved onto the new primitives**: page headers with subtitles
  on Tasks, Habits, Calendar, Focus, Progress, Review and Settings; Progress
  now renders XP bars through the shared `Progress` component; Today leads with
  a hero panel showing the wolf mark.
- **Spelling and tone of product copy** no longer look like the pixel era —
  settings described motion and effects rather than CRT phosphor, and the
  package describes Wolf without calling it pixel-art.
- **Button labels and controls** drop the `+` prefix (`New countdown`,
  `New event`, `New task`).

### Removed

- **The CRT phosphor theme and the pixel stylesheet** (`crt.css`,
  `pixel.css`), and the fonts that only served the old look (VT323,
  Silkscreen, Press Start 2P).
- **The pixel logo asset** (`logo-pixels.json`) and the `PixelProgress`
  component, both replaced by the vector mark and `Progress`.

## [0.2.0] - 2026-10-08

**Prototype release.** Wolf is not finished; this snapshot marks how far the
rewrite has come, not a stable product.

The assistant is gone, progress tracking is in. Experience points, levels,
countdowns and a commit log join the dashboard; calendar events repeat; a weekly
Review page sums the week up; and the wolf is redrawn as a full-body procedural
sprite set with its own logo.

### Added

- **Experience points, levels, countdowns and a commit log.** Tasks, habits,
  focus sessions and countdowns all pay out; the Progress page shows the balance
  as a level, tracks named countdowns, and records what you shipped in a commit
  log synced from git. Three append-only migrations carry the tables.
- **Countdown experience points**, awarded once per countdown and revoked again
  if you reopen or delete it, so the balance cannot be farmed or stranded.
- **Repeating calendar events** — daily, on weekdays, or weekly. The series is
  expanded at query time, so edits to the pattern take effect immediately.
- **A Review page**: this week's XP, focus minutes and sessions, next to what is
  overdue, due today, and still open in today's habits.
- **Focus options** — the next block or break can start itself, and a completed
  session ends on a clear completion state instead of silently rolling over.
- **Pet options** — choose what a click does and whether idle animations play.
  The companion is silent by default, drags under the pointer, and its scale
  snaps to whole pixels.
- **Settings** — accent hues (cyan, amber, neon), text size, spacing, CRT
  phosphor effects, backup export and import, and a developer mode with
  diagnostics. Digit keys 1 through 8 jump between sections.
- **A CRT phosphor theme**, with window effects to match.
- **Bundled fonts** — VT323 and Press Start 2P, with their OFL license texts
  recorded in `documents/legal/THIRD_PARTY_LICENSES.md`.
- **A dedicated wolf head logo**, drawn as pixel data and used to generate the
  app and tray icons.
- **A redrawn wolf**: eleven states and 37 frames generated from one 28x28
  matrix, including carrying and landing poses.
- **A `documents/` folder** holding the architecture and development guides, the
  license inventory, `CREDITS.md`, and `OPEN_QUESTIONS.md` recording what is
  known and undecided.

### Changed

- **The frontend is grouped by responsibility** rather than by kind. `src/app/` holds
  the shell, `src/features/<domain>/` holds each domain's page, store and logic,
  `src/lib/` holds dependency-free helpers, and `src/services/` remains the only place
  that names a Tauri command. No behavior change.
- **Comments are gone**, with `eslint-disable-next-line` lines as the only
  exception. Nothing was renamed to compensate.
- **`SettingsPage.tsx` is split per panel**, one component per file.
- **The tray menu** gained section shortcuts and a separator, and shows the main
  window only when it is asked to.
- **Deleting a task, habit or countdown revokes its experience points** in the
  same transaction that removes the row.
- **Controls, overflow and confirmations were polished** across the app: denser
  icon buttons, truncation where text could escape its box, and confirmation
  dialogs on the destructive paths that had none.
- Spelling in labels, identifiers and prose is American English.

### Fixed

- **The IPC contract test counted a commented-out command as registered**, so disabling
  a command in `generate_handler!` passed the suite. Only live lines count now.
- **Countdown experience points could be awarded twice** for the same
  countdown; the award now ignores repeats, and deletion pays it back.
- **The tray no longer hijacks the main window's route** when a menu item is
  meant for the companion.

### Removed

- **The local AI assistant and the whole Ollama integration**: the chat screen,
  model settings, intent classification, grounding, the `assistant` Rust module
  and its commands. Nothing leaves your machine because there is nothing to ask.
- **Experience surface the UI never rendered**: the `xp_total`,
  `list_xp_events` and `commit_days` commands, the summary's day and source
  slices, and their types.
- **Habit reminder settings and the messages they drove**, which no screen
  displayed.
- **The calendar query's `include_archived` flag**, which only the calendar
  path ever had and never used.
- **Tray action serialization**, kept only to test itself.
- Dead code across both halves: `closeCompanion`, the unused date helpers,
  `SPRITE_METADATA`, `PRIORITIES`, `OllamaModelDetail`, three of the four priority
  constants, `apply_startup_preferences`, `count_events_in_range`,
  `notify_best_effort`, and three of the four database test fixtures. About 30
  `export` keywords went with them, along with the unused tight and solid style
  variants and every keyframe animation the app did not play.

## [0.1.0] - 2026-09-30

First public release. Wolf is a local-first desktop companion for tasks, habits,
a calendar, focus sessions, and a local AI assistant. Everything is stored in a
SQLite database in your user data directory; nothing is sent anywhere except to
the Ollama daemon you configure, which must be on loopback.

### Added

- **Task, habit, calendar and focus tracking**, each with a dashboard, filters,
  and overview statistics.
- **Focus timer** with configurable block and break lengths, a Pomodoro-style
  session cycle, and a 7-day sparkline of completed minutes.
- **Local AI assistant** backed by Ollama. Questions are classified by intent and
  grounded with a block of your own tasks, habits, events and focus history before
  the model sees them, so the answers are about your day rather than in general.
  You choose the context the model receives by choosing the question.
- **Event reminders**, delivered through your desktop's notification service at a
  lead time you set per event.
- **Habit streaks and a 28-day completion grid**, with daily, weekday and weekly
  frequencies.
- **A pixel-art wolf companion** that reacts to what you are doing. The sprite is
  authored as a 28x28 character matrix and every one of its 31 frames is generated
  from that single source, so the artwork cannot drift between poses. It lives in
  its own transparent window and can be sized and positioned freely.
- **System tray integration**, with close-to-tray behavior and a menu for
  toggling the companion.
- **A generated icon set** from the same sprite data, including tray bitmaps and
  favicons, produced by a script with no image library dependency.
- **IPC contract test.** `ipcContract.test.ts` parses the frontend's `invoke`
  calls and the Rust `generate_handler!` list and fails if the two disagree on a
  command name or an argument key, closing a gap neither the type system nor the
  compiler checks.

### Fixed

- **Focus statistics were bucketed by UTC date.** A session at 23:30 and one at
  00:30 the next morning could both be counted on the same day for most
  timezones. Sessions are now grouped into seven local-day windows, and the
  boundary case is covered by tests in two timezones.
- **Ollama base URLs were not checked.** The app claimed to refuse anything but
  `http://localhost` or `http://127.0.0.1`, but nothing enforced it, so a
  configured host would receive your prompts. The URL is now validated when it is
  saved and a non-loopback host is refused.
- **The assistant's context was never sent.** The grounding code existed and was
  unit tested, but the frontend never called it, so the model answered without
  any of your data. The screen now resolves the context it displays and sends
  exactly that.
- **Event reminders were never delivered.** The sweep existed in Rust and was
  exposed to the frontend, but nothing polled it. It now runs on startup and
  every 30 seconds, gated on your settings and guarded against overlapping runs.

### Changed

- Removed the `theme` setting. It was persisted and offered in the UI, but no
  value of it changed any color, so it advertised a choice that did not exist.
  Existing databases keep their other settings.
- Removed the unused `assistant_suggestions` command, which had drifted away from
  the assistant screen's own copy of the same list.

### Removed

- Unused exports (`TIMER_STATUSES`, `progressLabel`, `lastCheckedAt`), an
  unused keyframe animation, two unreferenced type aliases, an unused
  dev-dependency, and two empty directories.

[Unreleased]: https://github.com/ArthurJosephLawson/Wolf/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/ArthurJosephLawson/Wolf/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/ArthurJosephLawson/Wolf/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/ArthurJosephLawson/Wolf/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/ArthurJosephLawson/Wolf/releases/tag/v0.1.0
