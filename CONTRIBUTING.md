# Contributing to Wolf

Thanks for looking at Wolf. This file covers what you need to get set up and what
a change is expected to look like before it is merged.

Wolf is maintained by Monk_Mango (Arthur Joseph Lawson), for ScriptMonks. Issues
and pull requests are reviewed by the maintainer.

There is more detail in [`documents/internal/DEVELOPMENT.md`](documents/internal/DEVELOPMENT.md) about where
code belongs, and [`documents/internal/ARCHITECTURE.md`](documents/internal/ARCHITECTURE.md) about how the
pieces fit together.

## Getting set up

Wolf is a Tauri app: a React frontend with a Rust backend and a SQLite database
in your user data directory. It makes no network requests.

You need Node 24 or newer, a Rust toolchain from 1.82, and the Tauri system
dependencies for your platform. On Debian or Ubuntu:

```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl \
  wget file libxdo-dev libssl-dev librsvg2-dev libayatana-appindicator3-dev \
  patchelf
```

Then:

```bash
npm install
npm run dev
```

`npm run dev` starts the desktop app. `npm run dev:web` starts only the frontend
in a browser against a stubbed desktop bridge, which is quicker when you are
working on UI.

The first launch creates its database and runs its migrations. Nothing else is
required.

## Before you open a pull request

Run the same checks CI runs:

```bash
npm run verify
```

That covers the type check, the linter, the frontend tests, and the Rust build
and tests. It does **not** cover three things, so run these too if you touched
Rust, or if CI is already red:

```bash
npm run rust:fmt     # note: this rewrites files, it is not a check
npm run rust:clippy  # -D warnings
npm run build:web
```

If you changed the wolf artwork or the generated icons:

```bash
node scripts/sprite/check-sprite.mjs
node scripts/sprite/generate-icons.mjs
```

`generate-icons.mjs` rewrites the PNGs under `src-tauri/icons` and `public`.
Commit them with your change.

## How changes are reviewed

Keep one logical thing per commit, and keep the history readable. A commit that
fixes a bug and reformats a file in the same change is hard to review and hard
to revert.

Write commit messages that explain **why**. The diff already shows what changed.

## Things worth knowing before you change them

A few decisions in this codebase look odd until you know the reason. They are
written down at the site, and this is the short version.

**The frontend never calls `invoke` directly.** Everything goes through
`src/services/`. `src/services/ipcContract.test.ts` parses both sides of that boundary
and fails if the frontend calls a command Rust does not register, or passes an
argument key the Rust signature does not accept. Tauri resolves both at runtime,
so a typo there is otherwise a production-only failure. Commenting a command out of
`generate_handler!` does not satisfy it either; only live lines count as registered.

**There are almost no comments.** If your change needs one to be understood, that is
usually a naming problem. Fix the names.

**Settings are one JSON blob.** Adding a field means adding it in
`src-tauri/src/models/settings.rs` _and_ `src/types/index.ts` _and_
`src/features/settings/settingsStore.ts`. Nothing tests that the two default copies
agree, so if you add a setting, check both by hand. Old databases will still load:
Serde ignores fields it does not know.

**A settings page is a panel per file.** `src/features/settings/` holds one component
per panel, each reading the store it needs and receiving `settings` and `set` as
props. When you add a panel, put it in its own file and keep `SettingsPage.tsx` as
layout.

**The wolf sprite is 28x28, not 24x26.** It is generated from
`src/assets/wolf/wolf-pixels.json` and mirrored about column 13.5. The dimensions
are asserted in `sprites.test.ts` and enforced by `scripts/sprite/check-sprite.mjs`, so
you will find out immediately if you break the shape.

**Migrations are applied in the order of the `MIGRATIONS` array** in
`src-tauri/src/database/migrator.rs`, not in filename order. They run once each
and never drop a table.

**Status colors are fixed while the accent moves.** Teal reads as fine,
amber as attention, rose as problem, green as success, and `--accent` follows
the chosen accent hue (cyan, amber or rose). Contrast expectations are
classified in `src/styles/theme.contrast.test.ts` as TEXT (4.5), UI (3) and
INK-on-FILL (4.5); non-interactive icon fill colors sit on `--outline` at
4.5 or better.

**The wolf brand mark is one vector source.** `src/assets/brand/wolf-mark.svg`
feeds `scripts/brand/generate-icons.mjs`, which rewrites the window, tray and
favicon PNGs plus `src/assets/brand/wolf-mark.ts`. Run `npm run icons` after
editing the mark. The companion sprite is separate: it stays a pixel dataset in
`src/assets/wolf/` driven by `scripts/sprite/check-sprite.mjs`.

**A new IPC command needs a browser mock.** `src/dev/mockInvoke.ts` answers
every command `npm run dev:web` can reach so the interface renders without Rust.
Add a fixture there when you add a command; `mockInvoke.test.ts` fails if the
frontend can invoke something the mock does not answer.

**Pure functions where possible.** The timer, the date helpers, the task
filters and the whole sprite pipeline take their inputs
as arguments and have no clock, no network and no filesystem. That is what lets
the whole suite run in seconds with no setup file. Please keep new logic in that
shape, and pass `now` in rather than reading the clock.

## Tests

Neither suite needs a display, a network connection, or a database file. The Rust
tests run real migrations against in-memory SQLite, so if you touch
`src-tauri/migrations/`, the Rust tests are the place to prove it still applies.

Name a test after the invariant it protects, not the function it calls. A failing
test should tell you what broke without opening the file:

```ts
it("treats the due date as a calendar day, not a timestamp", () => { ... });
```

If you are fixing a bug, add the test that would have caught it, and say in the
commit message what the bug was.

## Reporting bugs

Open an issue and include your OS, your Wolf version, and the output of
`npm run verify`.

Please do not open a public issue for a security problem. Use the private
reporting route GitHub offers on the Security tab.

## License

Wolf is MIT licensed. See [`LICENSE`](LICENSE). By contributing you agree that
your contribution is published under the same terms.

The third-party software Wolf is built on is listed in
[`CREDITS.md`](CREDITS.md).
