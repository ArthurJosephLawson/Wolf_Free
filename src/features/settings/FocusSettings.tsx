import { FocusField } from "./FocusField";
import { Toggle } from "./SettingsFields";
import type { Settings } from "../../types";
const FOCUS_PRESETS = [15, 25, 45, 50, 90];
const SHORT_BREAK_PRESETS = [3, 5, 8, 10];
const LONG_BREAK_PRESETS = [10, 15, 20, 30];
const SESSION_PRESETS = [2, 3, 4, 5];

export function FocusSettings({
  settings,
  set,
}: {
  settings: Settings;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}) {
  return (
    <div className="stack">
      <FocusField
        label="Focus length"
        value={settings.focusMinutes}
        presets={FOCUS_PRESETS}
        onChange={(value) => set("focusMinutes", value)}
      />
      <FocusField
        label="Short break"
        value={settings.shortBreakMinutes}
        presets={SHORT_BREAK_PRESETS}
        onChange={(value) => set("shortBreakMinutes", value)}
      />
      <FocusField
        label="Long break"
        value={settings.longBreakMinutes}
        presets={LONG_BREAK_PRESETS}
        onChange={(value) => set("longBreakMinutes", value)}
      />
      <FocusField
        label="Sessions before a long break"
        value={settings.sessionsBeforeLongBreak}
        presets={SESSION_PRESETS}
        onChange={(value) => set("sessionsBeforeLongBreak", value)}
      />
      <Toggle
        label="Start breaks automatically"
        checked={settings.autoStartBreaks}
        onChange={(value) => set("autoStartBreaks", value)}
      />
      <Toggle
        label="Start focus automatically"
        checked={settings.autoStartFocus}
        onChange={(value) => set("autoStartFocus", value)}
      />
    </div>
  );
}
