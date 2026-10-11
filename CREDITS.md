# Credits

Wolf is written and maintained by Monk_Mango (Arthur Joseph Lawson), for
ScriptMonks. This file records who made it and what it is built on. Every
version and license below was read from the package, crate or font file itself,
not from memory.

Full upstream license texts are in
[`documents/legal/THIRD_PARTY_LICENSES.md`](documents/legal/THIRD_PARTY_LICENSES.md).

## Developer and Company

| Role      | Who                               |
| --------- | --------------------------------- |
| Developer | Arthur Joseph Lawson (Monk_Mango) |
| Company   | ScriptMonks                       |

## Find Us

| Where               | Handle                                                       |
| ------------------- | ------------------------------------------------------------ |
| Instagram (company) | [@monk_mango](https://instagram.com/monk_mango)              |
| GitHub (developer)  | [@ArthurJosephLawson](https://github.com/ArthurJosephLawson) |
| GitHub (company)    | [@Script_monks](https://github.com/Script_monks)             |

## Design and Direction

The interface, the wolf sprite, the color palette and the feature set are the
work of Arthur Joseph Lawson, credited above as Monk_Mango.

## Fonts

Wolf ships its own font files. No font is loaded from a network address at
runtime.

| Font           | Version | Role                                 | License                   | Upstream                                                    |
| -------------- | ------- | ------------------------------------ | ------------------------- | ----------------------------------------------------------- |
| Inter          | 4.1     | Interface text and titlebar brand    | SIL Open Font License 1.1 | https://github.com/google/fonts/tree/main/ofl/inter         |
| JetBrains Mono | 2.304   | Data text, labels, buttons and chips | SIL Open Font License 1.1 | https://github.com/google/fonts/tree/main/ofl/jetbrainsmono |

Copyright lines, taken from each font's own `name` table and from the license
header bundled beside it:

> Copyright 2020 The Inter Project Authors (https://github.com/rsms/inter)

> Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono)

Two files are bundled in `src/assets/fonts/`: `Inter[opsz,wght].ttf` and
`JetBrainsMono[wght].ttf`. The license texts sit beside them as
`Inter-OFL.txt` and `JetBrainsMono-OFL.txt`.

## Libraries and Frameworks

Installed versions are the ones in `package-lock.json` and `Cargo.lock`.

### Runtime JavaScript

| Package           | Version | License           | Project                             |
| ----------------- | ------- | ----------------- | ----------------------------------- |
| `@tauri-apps/api` | 2.12.0  | Apache-2.0 OR MIT | https://github.com/tauri-apps/tauri |
| `react`           | 19.3.0  | MIT               | https://react.dev/                  |
| `react-dom`       | 19.3.0  | MIT               | https://react.dev/                  |
| `zustand`         | 5.0.15  | MIT               | https://github.com/pmndrs/zustand   |

### Development JavaScript

| Package                       | Version | License           | Project                                                    |
| ----------------------------- | ------- | ----------------- | ---------------------------------------------------------- |
| `@eslint/js`                  | 10.0.1  | MIT               | https://eslint.org                                         |
| `@tauri-apps/cli`             | 2.12.0  | Apache-2.0 OR MIT | https://github.com/tauri-apps/tauri                        |
| `@types/node`                 | 26.6.3  | MIT               | https://github.com/DefinitelyTyped/DefinitelyTyped         |
| `@types/react`                | 19.3.0  | MIT               | https://github.com/DefinitelyTyped/DefinitelyTyped         |
| `@types/react-dom`            | 19.3.0  | MIT               | https://github.com/DefinitelyTyped/DefinitelyTyped         |
| `@vitejs/plugin-react`        | 6.1.1   | MIT               | https://github.com/vitejs/vite-plugin-react                |
| `eslint`                      | 10.11.0 | MIT               | https://eslint.org                                         |
| `eslint-plugin-react-hooks`   | 7.1.1   | MIT               | https://react.dev/                                         |
| `eslint-plugin-react-refresh` | 0.5.7   | MIT               | https://github.com/ArnaudBarre/eslint-plugin-react-refresh |
| `globals`                     | 17.12.0 | MIT               | https://github.com/sindresorhus/globals                    |
| `jsdom`                       | 30.1.1  | MIT               | https://github.com/jsdom/jsdom                             |
| `prettier`                    | 3.9.9   | MIT               | https://prettier.io                                        |
| `typescript`                  | 5.9.3   | Apache-2.0        | https://www.typescriptlang.org/                            |
| `typescript-eslint`           | 8.70.1  | MIT               | https://typescript-eslint.io                               |
| `vite`                        | 8.3.1   | MIT               | https://vite.dev                                           |
| `vitest`                      | 5.0.2   | MIT               | https://vitest.dev                                         |

### Rust crates

Direct dependencies of the `wolf` crate. Licenses are read from each crate's own
`Cargo.toml` in the local Cargo registry.

| Crate                          | Version | License           | Project                                         |
| ------------------------------ | ------- | ----------------- | ----------------------------------------------- |
| `tauri`                        | 2.12.0  | Apache-2.0 OR MIT | https://github.com/tauri-apps/tauri             |
| `tauri-build`                  | 2.7.0   | Apache-2.0 OR MIT | https://github.com/tauri-apps/tauri             |
| `tauri-plugin-opener`          | 2.6.0   | Apache-2.0 OR MIT | https://github.com/tauri-apps/plugins-workspace |
| `tauri-plugin-single-instance` | 2.5.0   | Apache-2.0 OR MIT | https://github.com/tauri-apps/plugins-workspace |
| `serde`                        | 1.0.229 | MIT OR Apache-2.0 | https://github.com/serde-rs/serde               |
| `serde_json`                   | 1.0.151 | MIT OR Apache-2.0 | https://github.com/serde-rs/json                |
| `thiserror`                    | 2.0.21  | MIT OR Apache-2.0 | https://github.com/dtolnay/thiserror            |
| `log`                          | 0.4.34  | MIT OR Apache-2.0 | https://github.com/rust-lang/log                |
| `rusqlite`                     | 0.40.2  | MIT               | https://github.com/rusqlite/rusqlite            |
| `chrono`                       | 0.4.45  | MIT OR Apache-2.0 | https://github.com/chronotope/chrono            |
| `uuid`                         | 1.26.1  | Apache-2.0 OR MIT | https://github.com/uuid-rs/uuid                 |
| `notify-rust`                  | 4.18.1  | MIT               | https://github.com/hoodie/notify-rust           |

## Tooling

| Tool           | Version                                           | Role                                 |
| -------------- | ------------------------------------------------- | ------------------------------------ |
| Node.js        | 20 or newer in `engines`; see `package.json`      | Builds and runs the frontend         |
| npm            | —                                                 | Installs the JavaScript dependencies |
| Rust toolchain | 1.82 or newer in `rust-version`; see `Cargo.toml` | Builds and runs the Tauri backend    |
| cargo          | —                                                 | Rust package manager                 |
| Prettier       | 3.9.9                                             | Formatting                           |
| ESLint         | 10.11.0                                           | Linting                              |
| Vitest         | 5.0.2                                             | Frontend tests                       |
| GitHub Actions | —                                                 | CI, see `.github/workflows/ci.yml`   |

Tauri's own system-library requirements for Linux packaging are listed in
[`CONTRIBUTING.md`](CONTRIBUTING.md).
