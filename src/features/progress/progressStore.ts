import { create } from "zustand";
import { toAppError } from "../../lib/errors";
import { commitService } from "../../services/commits";
import { countdownService } from "../../services/countdowns";
import { xpService } from "../../services/xp";
import type {
  CommitLog,
  Countdown,
  CountdownUpdate,
  NewCommitLog,
  NewCountdown,
  XpSummary,
} from "../../types";

interface ProgressStore {
  summary: XpSummary | null;
  countdowns: Countdown[];
  commits: CommitLog[];
  loading: boolean;
  saving: boolean;
  error: string | null;

  load: (options?: { syncCommits?: boolean }) => Promise<void>;
  refreshSummary: () => Promise<void>;
  syncCommits: () => Promise<boolean>;
  createCountdown: (countdown: NewCountdown) => Promise<boolean>;
  updateCountdown: (id: string, update: CountdownUpdate) => Promise<boolean>;
  removeCountdown: (id: string) => Promise<boolean>;
  createCommit: (commit: NewCommitLog) => Promise<boolean>;
  removeCommit: (id: string) => Promise<boolean>;
  clearError: () => void;
}

export const useProgressStore = create<ProgressStore>((set, get) => ({
  summary: null,
  countdowns: [],
  commits: [],
  loading: false,
  saving: false,
  error: null,

  async load(options) {
    set({ loading: true, error: null });
    try {
      const [summary, countdowns, commits] = await Promise.all([
        xpService.summary(),
        countdownService.list(),
        options?.syncCommits ? commitService.sync() : commitService.list(),
      ]);
      set({ summary, countdowns, commits, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: toAppError(error, "Wolf could not load your progress.").message,
      });
    }
  },

  async refreshSummary() {
    try {
      const summary = await xpService.summary();
      set({ summary });
    } catch (error) {
      set({
        error: toAppError(error, "Wolf could not refresh your XP.").message,
      });
    }
  },

  async syncCommits() {
    set({ saving: true, error: null });
    try {
      const commits = await commitService.sync();
      set({ commits, saving: false });
      return true;
    } catch (error) {
      set({
        saving: false,
        error: toAppError(error, "Wolf could not sync commits from git.")
          .message,
      });
      return false;
    }
  },

  async createCountdown(countdown) {
    set({ saving: true, error: null });
    try {
      await countdownService.create(countdown);
      const countdowns = await countdownService.list();
      set({ countdowns, saving: false });
      return true;
    } catch (error) {
      set({
        saving: false,
        error: toAppError(error, "Wolf could not create that countdown.")
          .message,
      });
      return false;
    }
  },

  async updateCountdown(id, update) {
    set({ saving: true, error: null });
    try {
      await countdownService.update(id, update);
      const countdowns = await countdownService.list();
      set({ countdowns, saving: false });
      void get().refreshSummary();
      return true;
    } catch (error) {
      set({
        saving: false,
        error: toAppError(error, "Wolf could not update that countdown.")
          .message,
      });
      return false;
    }
  },

  async removeCountdown(id) {
    set({ saving: true, error: null });
    try {
      await countdownService.remove(id);
      set((state) => ({
        countdowns: state.countdowns.filter((entry) => entry.id !== id),
        saving: false,
      }));
      void get().refreshSummary();
      return true;
    } catch (error) {
      set({
        saving: false,
        error: toAppError(error, "Wolf could not delete that countdown.")
          .message,
      });
      return false;
    }
  },

  async createCommit(commit) {
    set({ saving: true, error: null });
    try {
      await commitService.create(commit);
      const commits = await commitService.list();
      set({ commits, saving: false });
      return true;
    } catch (error) {
      set({
        saving: false,
        error: toAppError(error, "Wolf could not log that commit.").message,
      });
      return false;
    }
  },

  async removeCommit(id) {
    set({ saving: true, error: null });
    try {
      await commitService.remove(id);
      set((state) => ({
        commits: state.commits.filter((entry) => entry.id !== id),
        saving: false,
      }));
      return true;
    } catch (error) {
      set({
        saving: false,
        error: toAppError(error, "Wolf could not delete that commit.").message,
      });
      return false;
    }
  },

  clearError() {
    set({ error: null });
  },
}));
