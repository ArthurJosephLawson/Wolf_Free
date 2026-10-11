import { invoke } from "./ipc";
import type { CommitLog, NewCommitLog } from "../types";

export const commitService = {
  list(limit = 200): Promise<CommitLog[]> {
    return invoke<CommitLog[]>("list_commit_logs", { limit });
  },

  sync(limit = 200): Promise<CommitLog[]> {
    return invoke<CommitLog[]>("sync_commit_logs", { limit });
  },

  create(commit: NewCommitLog): Promise<CommitLog> {
    return invoke<CommitLog>("create_commit_log", { commit });
  },

  remove(id: string): Promise<void> {
    return invoke<void>("delete_commit_log", { id });
  },
};
