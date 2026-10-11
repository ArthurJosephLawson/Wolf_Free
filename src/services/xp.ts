import { invoke } from "./ipc";
import type { XpSummary } from "../types";

export const xpService = {
  summary(days = 28): Promise<XpSummary> {
    return invoke<XpSummary>("xp_summary", { days });
  },
};
