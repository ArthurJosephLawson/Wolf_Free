import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./settingsStore";

const PAGE = readFileSync(
  join(process.cwd(), "src", "features", "settings", "SettingsPage.tsx"),
  "utf8",
);
const BACKUP = readFileSync(
  join(process.cwd(), "src", "features", "settings", "BackupSettings.tsx"),
  "utf8",
);
const TYPES = readFileSync(
  join(process.cwd(), "src", "types", "index.ts"),
  "utf8",
);

describe("comfort and palette defaults", () => {
  it("ships green, default text and normal spacing with developer mode off", () => {
    expect(DEFAULT_SETTINGS.accent).toBe("green");
    expect(DEFAULT_SETTINGS.textSize).toBe("md");
    expect(DEFAULT_SETTINGS.density).toBe("normal");
    expect(DEFAULT_SETTINGS.developerMode).toBe(false);
  });

  it("declares every key in the settings type", () => {
    for (const key of ["accent", "textSize", "density", "developerMode"]) {
      expect(TYPES).toContain(`${key}:`);
    }
  });
});

describe("display controls", () => {
  it("offers accent, text size and spacing pickers", () => {
    expect(PAGE).toContain('label="Accent"');
    expect(PAGE).toContain('label="Text size"');
    expect(PAGE).toContain('label="Spacing"');
  });
});

describe("backup panel", () => {
  it("exports to a file and imports behind a confirmation", () => {
    expect(BACKUP).toContain('<Panel title="Backup"');
    expect(BACKUP).toContain("backupService.export()");
    expect(BACKUP).toContain('type="file"');
    expect(BACKUP).toContain("Import this file?");
    expect(BACKUP).toContain("backupService.import(");
    expect(PAGE).toContain("BackupSettings");
  });
});

describe("developer mode", () => {
  it("is no longer surfaced in the free edition settings", () => {
    expect(PAGE).not.toContain('label="Developer mode"');
    expect(PAGE).not.toContain("diagnostics");
  });
});

describe("focus and companion options", () => {
  it("ships the new keys at their defaults", () => {
    expect(DEFAULT_SETTINGS.autoStartBreaks).toBe(false);
    expect(DEFAULT_SETTINGS.autoStartFocus).toBe(false);
    expect(DEFAULT_SETTINGS.companionClickAction).toBe("poke");
    expect(DEFAULT_SETTINGS.companionIdleAnimations).toBe(true);
    for (const key of [
      "autoStartBreaks",
      "autoStartFocus",
      "companionClickAction",
      "companionIdleAnimations",
    ]) {
      expect(TYPES).toContain(`${key}:`);
    }
  });

  it("exposes the auto-start toggles in focus settings", () => {
    const FOCUS = readFileSync(
      join(process.cwd(), "src", "features", "settings", "FocusSettings.tsx"),
      "utf8",
    );
    expect(FOCUS).toContain('label="Start breaks automatically"');
    expect(FOCUS).toContain('label="Start focus automatically"');
    expect(FOCUS).toContain('set("autoStartBreaks"');
    expect(FOCUS).toContain('set("autoStartFocus"');
  });

  it("exposes the click action and idle animation in desktop settings", () => {
    const DESKTOP = readFileSync(
      join(process.cwd(), "src", "features", "settings", "DesktopSettings.tsx"),
      "utf8",
    );
    expect(DESKTOP).toContain("settings-companion-click");
    expect(DESKTOP).toContain('"companionClickAction"');
    expect(DESKTOP).toContain('label="Companion idle animations"');
    expect(DESKTOP).toContain('set("companionIdleAnimations"');
  });
});
