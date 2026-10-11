import { create } from "zustand";
import { settingsService } from "../../services/settings";
import { toAppError } from "../../lib/errors";
import type { Settings } from "../../types";

export const DEFAULT_SETTINGS: Settings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  notificationsEnabled: true,
  eventRemindersEnabled: true,
  soundEnabled: true,
  companionEnabled: true,
  companionAlwaysOnTop: true,
  companionScale: 3,
  companionX: null,
  companionY: null,
  companionClickAction: "poke",
  companionIdleAnimations: true,
  startMinimized: false,
  closeToTray: true,
  effectsEnabled: true,
  accent: "green",
  textSize: "md",
  density: "normal",
  developerMode: false,
  userName: "",
  repoPath: "",
};

interface SettingsState {
  settings: Settings;
  loaded: boolean;
  saving: boolean;
  error: string | null;
  load: () => Promise<void>;
  update: (patch: Partial<Settings>) => Promise<void>;
  clearError: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  saving: false,
  error: null,

  async load() {
    try {
      const settings = await settingsService.get();
      set({ settings, loaded: true, error: null });
    } catch (error) {
      set({
        settings: DEFAULT_SETTINGS,
        loaded: true,
        error: toAppError(error, "Wolf could not load your settings.").message,
      });
    }
  },

  async update(patch) {
    const previous = get().settings;
    const optimistic = { ...previous, ...patch };
    set({ settings: optimistic, saving: true, error: null });

    try {
      const saved = await settingsService.save(optimistic);
      set({ settings: saved, saving: false });
    } catch (error) {
      set({
        settings: previous,
        saving: false,
        error: toAppError(error, "Wolf could not save that setting.").message,
      });
    }
  },

  clearError() {
    set({ error: null });
  },
}));

export function useFocusDurations(): Pick<
  Settings,
  | "focusMinutes"
  | "shortBreakMinutes"
  | "longBreakMinutes"
  | "sessionsBeforeLongBreak"
> {
  const focusMinutes = useSettingsStore((s) => s.settings.focusMinutes);
  const shortBreakMinutes = useSettingsStore(
    (s) => s.settings.shortBreakMinutes,
  );
  const longBreakMinutes = useSettingsStore((s) => s.settings.longBreakMinutes);
  const sessionsBeforeLongBreak = useSettingsStore(
    (s) => s.settings.sessionsBeforeLongBreak,
  );
  return {
    focusMinutes,
    shortBreakMinutes,
    longBreakMinutes,
    sessionsBeforeLongBreak,
  };
}
