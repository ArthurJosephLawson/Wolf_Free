import { invoke } from "./ipc";
import type { FocusSession, FocusStats, NewFocusSession } from "../types";

export const focusService = {
  list(limit = 20): Promise<FocusSession[]> {
    return invoke<FocusSession[]>("list_focus_sessions", { limit });
  },

  create(session: NewFocusSession): Promise<FocusSession> {
    return invoke<FocusSession>("create_focus_session", { session });
  },

  remove(id: string): Promise<void> {
    return invoke<void>("delete_focus_session", { id });
  },

  stats(): Promise<FocusStats> {
    return invoke<FocusStats>("focus_stats");
  },
};
