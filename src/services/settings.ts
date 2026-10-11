import { invoke } from "./ipc";
import type { Settings } from "../types";

export const settingsService = {
  get(): Promise<Settings> {
    return invoke<Settings>("get_settings");
  },

  save(settings: Settings): Promise<Settings> {
    return invoke<Settings>("save_settings", { settings });
  },
};
