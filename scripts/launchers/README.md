# Wolf launchers

Scripts that add Wolf to your application bar. Run the one for your system once.

| Platform | File              | What it does                                             |
| -------- | ----------------- | -------------------------------------------------------- |
| Linux    | `WOLF.sh`         | Writes `~/.local/bin/wolf` and a `.desktop` entry.       |
| Windows  | `WOLF.bat`        | Calls `WOLF.ps1` to create a Start Menu shortcut.        |
| Windows  | `WOLF.ps1`        | Creates the Start Menu `.lnk` directly.                  |
| macOS    | `WOLF.command`    | Builds `Wolf.app` in `~/Applications` (or a path you pass).|

Each script prefers a built binary at `src-tauri/target/release/wolf`, then a
`wolf` on your `PATH`, then falls back to the dev build via `npm run tauri -- dev`.

## Linux

```bash
chmod +x scripts/launchers/WOLF.sh
./scripts/launchers/WOLF.sh
```

Ensure `~/.local/bin` is on your `PATH`, then search "Wolf" in your launcher.

## Windows

```powershell
./scripts/launchers/WOLF.bat
```

The shortcut appears in the Start Menu after you sign out or press the Windows
key and search "Wolf".

## macOS

```bash
chmod +x scripts/launchers/WOLF.command
./scripts/launchers/WOLF.command
```

For a system-wide install, pass a destination: `./scripts/launchers/WOLF.command /Applications`.
The bundle is unsigned, so the first launch may need right-click, Open.
