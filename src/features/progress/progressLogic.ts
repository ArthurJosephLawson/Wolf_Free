import { parseDateKey } from "../../lib/date";
import type { CommitLog, Countdown } from "../../types";

interface CommitGroup {
  day: string;
  commits: CommitLog[];
}

export function daysUntil(targetDate: string, today: string): number {
  const target = parseDateKey(targetDate).getTime();
  const from = parseDateKey(today).getTime();
  if (Number.isNaN(target) || Number.isNaN(from)) return 0;
  return Math.round((target - from) / 86_400_000);
}

export function groupCommitsByDay(commits: CommitLog[]): CommitGroup[] {
  const groups = new Map<string, CommitLog[]>();
  for (const commit of commits) {
    const bucket = groups.get(commit.committedOn);
    if (bucket) {
      bucket.push(commit);
    } else {
      groups.set(commit.committedOn, [commit]);
    }
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([day, dayCommits]) => ({ day, commits: dayCommits }));
}

export function nearestCountdown(
  countdowns: Countdown[],
  today: string,
): Countdown | null {
  let best: Countdown | null = null;
  let bestDays = Number.POSITIVE_INFINITY;
  for (const countdown of countdowns) {
    if (countdown.completedAt) continue;
    const days = daysUntil(countdown.targetDate, today);
    if (days < 0 || days >= bestDays) continue;
    best = countdown;
    bestDays = days;
  }
  return best;
}
