# Wolf design system — v0.3.0

- **Status:** CURRENT
- **Applies to:** 0.3.0
- **Owner:** Arthur Joseph Lawson / ScriptMonks

This document is the source of truth for Wolf's visual language from 0.3.0 on.
It replaces the CRT/pixel identity used through 0.2.0.

## 1. Audit summary (why we are changing)

Evidence is in `V0.3.0_PLAN.md` (findings F-1…F-14). In short:

- The 0.2.0 UI painted `--neon` green text on every surface, used 2px hard
  borders and pixel drop shadows, and laid a scanline + vignette overlay over
  the window. Every element had near-identical visual weight, so hierarchy was
  flat (F-7).
- Body and label text were small and low-emphasis (13px body, `.faint` at
  0.846rem) (F-8).
- Fonts were pixel display faces (VT323, Silkscreen, Press Start 2P), which are
  hard to read in long labels and produce poor tabular numerals (F-9).
- The Today page showed the date twice (F-1), duplicated the companion wolf
  preview next to the real companion window (F-2), stacked six equal counters
  (F-3), and had a quick-add row with inconsistent control shapes (F-5).

## 2. Direction

Wolf is a calm, daily-use desktop tool for focus and habits. The redesign
prioritizes legibility, clear hierarchy and low visual noise over decoration.

- One restrained accent, a neutral surface ramp, and semantic status colors
  that never carry meaning alone (always paired with text or an icon).
- No gradients, glass, glow, neon outlines, cards-in-cards, or filler stats.
- Native window decorations are kept. No custom title bar.
- Dark-first. A single dark theme ships in 0.3.0; light mode is out of scope.

## 3. Typography

Pairing, both SIL Open Font License 1.1, bundled locally (no runtime fetch):

| Token | Family | Use |
|---|---|---|
| `--font-body` | Inter (variable) | All prose, labels, controls, headings |
| `--font-mono` | JetBrains Mono (variable) | Timer, XP, stat values, countdowns, tabular numerals |

Both are loaded as variable `.ttf` files from `src/assets/fonts/`. License
files are bundled beside them and recorded in `CREDITS.md` and
`documents/legal/THIRD_PARTY_LICENSES.md`.

Type scale (rem against the root, which follows the body-size setting):

| Token | rem | Typical use |
|---|---|---|
| `--text-xs` | 0.75rem | badges, chips, meta |
| `--text-sm` | 0.875rem | secondary text |
| `--text-base` | 1rem | body, controls |
| `--text-lg` | 1.125rem | panel titles |
| `--text-xl` | 1.375rem | page titles |
| `--text-2xl` | 1.75rem | hero numbers |
| `--text-3xl` | 2.5rem | timer / level |

Body size setting: `sm` = 14px, `md` = 15px (default), `lg` = 17px. All stats,
the timer and countdowns use `font-variant-numeric: tabular-nums`.

## 4. Color tokens

Neutral surface ramp (deep, desaturated slate):

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0f1418` | app background |
| `--bg-sunken` | `#0a0e11` | wells, inputs, tracks |
| `--bg-raised` | `#171f24` | titlebar, footer, raised rows |
| `--panel` | `#141b20` | cards/panels |
| `--panel-alt` | `#1c262c` | hover fills |
| `--border` | `#26323a` | default dividers |
| `--border-strong` | `#3d4e58` | controls, focus-adjacent borders |

Ink ramp:

| Token | Value | Use |
|---|---|---|
| `--text` | `#e8eef2` | primary text |
| `--text-dim` | `#a9b8c1` | secondary text |
| `--text-faint` | `#7d8d96` | meta text |
| `--outline` | `#0a0e11` | ink on bright fills |

Accent (default `cyan`): `--accent: #4fb3bf`. Accent choices in Settings:

| value | label | hex |
|---|---|---|
| `cyan` | Teal | `#4fb3bf` |
| `amber` | Amber | `#e0a458` |
| `rose` | Rose | `#e081a0` |

Legacy `neon` value is retired; a saved `accent: "neon"` migrates to `cyan`
(document D-3).

Semantic status (always paired with text/icon):

| Token | Value |
|---|---|
| `--success` | `#57c08a` |
| `--warning` | `#e0a458` |
| `--danger` | `#e2685f` |

`--primary` aliases `--accent`; `--primary-dim`, `--success-dim`,
`--warning-dim`, `--danger-dim` provide 3:1 border variants.

All text tokens clear WCAG AA (4.5:1) on `--bg`, `--bg-sunken` and `--panel`;
all UI/border tokens clear 3:1. Enforced by `src/styles/theme.contrast.test.ts`.

## 5. Space, radius, elevation, motion

Spacing (8pt base, rem so it follows text size):

`--space-1` 4px · `--space-2` 8px · `--space-3` 12px · `--space-4` 16px ·
`--space-5` 24px · `--space-6` 32px. `--gap` maps to `--space-3` by default and
to `--space-2`/`--space-4` for compact/roomy density.

Radius: `--radius-sm` 4px · `--radius` 8px · `--radius-lg` 12px ·
`--radius-pill` 999px. Controls use `--radius-sm`, panels `--radius`.

Elevation (soft, low):

- `--shadow-sm`: `0 1px 2px rgba(0,0,0,0.4)`
- `--shadow`: `0 6px 20px rgba(0,0,0,0.35)`
- `--shadow-lg`: `0 18px 48px rgba(0,0,0,0.45)`

Motion: `--dur-fast` 120ms · `--dur` 200ms · `--ease`
`cubic-bezier(0.2,0,0,1)`. All motion is suppressed by
`prefers-reduced-motion` and by the "Window effects" setting
(`data-effects="off"`).

## 6. Components

Restyled in `src/components/ui.tsx` + `globals.css`:

- Panel, PageHeader (new), StatCard (replaces pixel Stat), Chip/Badge, Empty,
  Field, Button (`.btn` + primary/danger/ghost), Input/Select/Textarea, Modal,
  Toast, Progress (linear + segmented), Tabs/Segmented, Toggle, IconButton.
- Page header pattern: title (with the date once), optional subtitle line,
  right-aligned actions, `1px` bottom divider.

## 7. State rules

- hover: surface lifts one step (`--bg-raised` / `--panel-alt`), border stays.
- focus-visible: `2px` `--accent` outline, `2px` offset, always visible.
- active: no transform shift (drop the old pixel "press"); slight background
  darken.
- disabled: 45% opacity, `not-allowed`, no hover.
- loading: text "Loading…" in an empty state, or a segmented progress.
- empty: centered muted text (never bare), with an optional action.
- error: danger left bar + `role="alert"`.
- success: success left bar + `role="status"`.

## 8. Accessibility targets

- WCAG AA contrast for text and essential UI (tests enforce).
- Full keyboard operability; every icon-only button has an `aria-label`.
- Visible focus rings.
- `prefers-reduced-motion` respected.
- Status is not conveyed by color alone (badges carry text).
- Minimum comfortable target: 32px controls, 24px for dense icon buttons.

## 9. Deliberately preserved

- The eight sections and digit-key shortcuts 1–8.
- Data model, IPC surface and the privacy contract (no network).
- All existing settings except the retired CRT effects toggle (documented
  migration to "Window effects"; see plan D-4) and the retired accent value.
- The companion's state machine, silence-by-default and drag behavior. Its
  rendering decision is recorded in the plan (Phase 4).