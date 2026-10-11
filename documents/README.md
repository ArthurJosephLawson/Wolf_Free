# Documents

- **Status:** CURRENT
- **Owner:** Monk_Mango (Arthur Joseph Lawson) / ScriptMonks
- **Last reviewed:** 2026-10-10
- **Applies to:** 0.3.1

## What this folder is

Working documentation for Wolf, which is at **prototype stage (0.3.1, free
edition)** and not finished; these documents describe the project as it stands
now and will change with it. They record how it is built and who made it — the
things that are read occasionally rather than on every build.

The documents GitHub itself reads stay in the repository root, because that is
where it looks for them:

| Root file         | Purpose                                                            |
| ----------------- | ------------------------------------------------------------------ |
| `README.md`       | What Wolf is, how to install it, how to run the checks             |
| `CONTRIBUTING.md` | How to get set up and what a change is expected to look like       |
| `CHANGELOG.md`    | What changed in each released version                              |
| `CREDITS.md`      | Who made it, and the third-party software and fonts it is built on |
| `LICENSE`         | The license text itself                                            |
| `SECURITY.md`     | How to report a security problem                                   |
| `manual.md`       | The end-user manual for the free edition                           |

This folder links to those files rather than copying any of them, so there is
one copy of each and one place to change it.

## What is in here

### `internal/`

How the code is put together, for people changing it.

| Document          | Covers                                                                            |
| ----------------- | --------------------------------------------------------------------------------- |
| `ARCHITECTURE.md` | The webview-to-Rust seam, the service layer, state ownership, windows, migrations |
| `DEVELOPMENT.md`  | Where new code belongs, the order to add it in, day-to-day commands               |

### `legal/`

| Document                  | Covers                                                      |
| ------------------------- | ----------------------------------------------------------- |
| `THIRD_PARTY_LICENSES.md` | Every font bundled in the repository, with its license text |

### `screenshots/`

Interface captures for the current version, one per screen. See
`screenshots/README.md`.

### Root of this folder

| Document            | Covers                                                             |
| ------------------- | ------------------------------------------------------------------ |
| `OPEN_QUESTIONS.md` | Items waiting on the owner's word before their documents can close |

## Who it is for

- **Someone evaluating Wolf** — start at the root `README.md`.
- **Someone changing Wolf** — start at `CONTRIBUTING.md`, then `internal/DEVELOPMENT.md`.
- **Someone trying to understand why it is shaped this way** — `internal/ARCHITECTURE.md`.

## How it is kept current

Every document in this folder carries a header block stating its status, its
owner, the date it was last reviewed, and the Wolf version it applies to. A
document whose header says a different version from `package.json` is out of
date.

Change a document in the same commit as the code it describes. When two
documents would say the same thing, one of them links to the other instead.
