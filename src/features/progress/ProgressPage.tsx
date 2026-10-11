import { useEffect, useState } from "react";
import {
  Empty,
  ErrorNote,
  Modal,
  Panel,
  PageHeader,
} from "../../components/ui";
import { formatDayLong, todayKey } from "../../lib/date";
import { CommitDialog } from "./CommitDialog";
import { CountdownDialog } from "./CountdownDialog";
import { daysUntil, groupCommitsByDay } from "./progressLogic";
import { useProgressStore } from "./progressStore";
import { useSettingsStore } from "../settings/settingsStore";
import { XpBar } from "./XpBar";
import type {
  CommitLog,
  Countdown,
  NewCommitLog,
  NewCountdown,
} from "../../types";

type Pending =
  | { kind: "countdown"; entry: Countdown }
  | { kind: "commit"; entry: CommitLog }
  | null;

export function ProgressPage() {
  const store = useProgressStore();
  const repoPath = useSettingsStore((s) => s.settings.repoPath);
  const today = todayKey();
  const [countdownDialog, setCountdownDialog] = useState<Countdown | null>(
    null,
  );
  const [countdownOpen, setCountdownOpen] = useState(false);
  const [commitOpen, setCommitOpen] = useState(false);
  const [pending, setPending] = useState<Pending>(null);

  useEffect(() => {
    void store.load({ syncCommits: repoPath.trim() !== "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groups = groupCommitsByDay(store.commits);

  const saveCountdown = async (
    countdown: NewCountdown,
    id: string | null,
  ): Promise<boolean> => {
    const ok = id
      ? await store.updateCountdown(id, countdown)
      : await store.createCountdown(countdown);
    if (ok) setCountdownOpen(false);
    return ok;
  };

  const saveCommit = async (commit: NewCommitLog): Promise<void> => {
    const ok = await store.createCommit(commit);
    if (ok) setCommitOpen(false);
  };

  const confirmDelete = async () => {
    if (!pending) return;
    const ok =
      pending.kind === "countdown"
        ? await store.removeCountdown(pending.entry.id)
        : await store.removeCommit(pending.entry.id);
    if (ok) setPending(null);
  };

  return (
    <>
      <PageHeader
        title="Progress"
        subtitle="Level, countdowns and the work you logged."
      />

      <Panel title="Level">
        <ErrorNote message={store.error} onDismiss={store.clearError} />
        {store.summary ? (
          <>
            <div className="row" style={{ alignItems: "flex-end", gap: 12 }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 48,
                  lineHeight: 1,
                }}
              >
                {store.summary.level}
              </span>
              <div>
                <div className="mono-label">level</div>
                <div className="faint">{store.summary.lifetimeTotal} XP</div>
              </div>
            </div>
            <XpBar
              value={store.summary.xpIntoLevel}
              max={store.summary.xpIntoLevel + store.summary.xpForNextLevel}
            />
            <p className="faint" style={{ marginTop: 6 }}>
              {store.summary.xpIntoLevel} /{" "}
              {store.summary.xpIntoLevel + store.summary.xpForNextLevel} to
              level {store.summary.level + 1} · {store.summary.total} XP in the
              last 28 days
            </p>
          </>
        ) : store.loading ? (
          <p className="empty">Loading your level…</p>
        ) : (
          <Empty>No XP yet. Finish a task to earn your first 10.</Empty>
        )}
      </Panel>

      <Panel
        title="Countdowns"
        actions={
          <button
            type="button"
            className="btn btn--primary btn--small"
            onClick={() => {
              setCountdownDialog(null);
              setCountdownOpen(true);
            }}
          >
            New countdown
          </button>
        }
      >
        {store.loading && store.countdowns.length === 0 ? (
          <p className="empty">Loading countdowns…</p>
        ) : store.countdowns.length === 0 ? (
          <Empty>No countdowns yet. Name something worth waiting for.</Empty>
        ) : (
          <div className="stack">
            {store.countdowns.map((countdown) => (
              <CountdownRow
                key={countdown.id}
                countdown={countdown}
                today={today}
                onEdit={() => {
                  setCountdownDialog(countdown);
                  setCountdownOpen(true);
                }}
                onDelete={() =>
                  setPending({ kind: "countdown", entry: countdown })
                }
              />
            ))}
          </div>
        )}
      </Panel>

      <Panel
        title="Commits"
        actions={
          <>
            <button
              type="button"
              className="btn btn--small"
              disabled={repoPath.trim() === "" || store.saving}
              onClick={() => void store.syncCommits()}
            >
              {store.saving ? "Syncing…" : "Sync"}
            </button>
            <button
              type="button"
              className="btn btn--primary btn--small"
              onClick={() => setCommitOpen(true)}
            >
              + Log commit
            </button>
          </>
        }
      >
        {repoPath.trim() === "" ? (
          <p className="faint" style={{ marginBottom: 8 }}>
            Set a repository path in Settings to import commits from git.
          </p>
        ) : null}

        {store.loading && store.commits.length === 0 ? (
          <p className="empty">Loading commits…</p>
        ) : groups.length === 0 ? (
          <Empty>Nothing logged yet. Record what shipped today.</Empty>
        ) : (
          <div className="stack">
            {groups.map((group) => (
              <div key={group.day} className="stack" style={{ gap: 4 }}>
                <p className="mono-label">{formatDayLong(group.day)}</p>
                {group.commits.map((commit) => (
                  <CommitRow
                    key={commit.id}
                    commit={commit}
                    onDelete={() =>
                      setPending({ kind: "commit", entry: commit })
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </Panel>

      {countdownOpen ? (
        <CountdownDialog
          open
          busy={store.saving}
          initial={countdownDialog}
          onClose={() => setCountdownOpen(false)}
          onSave={saveCountdown}
        />
      ) : null}

      {commitOpen ? (
        <CommitDialog
          open
          busy={store.saving}
          onClose={() => setCommitOpen(false)}
          onSave={saveCommit}
        />
      ) : null}

      {pending ? (
        <Modal
          open
          title={
            pending.kind === "countdown" ? "Delete countdown" : "Delete commit"
          }
          onClose={() => setPending(null)}
          footer={
            <>
              <button
                type="button"
                className="btn btn--small"
                onClick={() => setPending(null)}
                disabled={store.saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--small"
                style={{
                  background: "var(--danger)",
                  color: "var(--outline)",
                  borderColor: "var(--outline)",
                }}
                onClick={() => void confirmDelete()}
                disabled={store.saving}
              >
                {store.saving ? "Deleting…" : "Delete"}
              </button>
            </>
          }
        >
          <p>
            {pending.kind === "countdown"
              ? `Delete "${pending.entry.label}"? This cannot be undone.`
              : `Delete "${pending.entry.message}" from your log? This cannot be undone.`}
          </p>
        </Modal>
      ) : null}
    </>
  );
}

function CountdownRow({
  countdown,
  today,
  onEdit,
  onDelete,
}: {
  countdown: Countdown;
  today: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const days = daysUntil(countdown.targetDate, today);
  const hasTarget = countdown.targetValue > 0;
  const ratio = hasTarget
    ? Math.min(1, Math.max(0, countdown.currentValue / countdown.targetValue))
    : 0;

  return (
    <div className="panel" style={{ padding: 8 }}>
      <div className="row" style={{ alignItems: "center", gap: 10 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 16,
            lineHeight: 1,
            minWidth: 48,
            textAlign: "right",
            color: days <= 0 ? "var(--warning)" : "var(--text)",
          }}
        >
          {days}
        </div>
        <div className="mono-label" style={{ width: 40 }}>
          days
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div>{countdown.label}</div>
          <div className="faint">{formatDayLong(countdown.targetDate)}</div>
        </div>

        <button
          type="button"
          className="btn btn--ghost btn--small"
          onClick={onEdit}
          title="Edit countdown"
          aria-label={`Edit ${countdown.label}`}
        >
          ✎
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--small"
          onClick={onDelete}
          title="Delete countdown"
          aria-label={`Delete ${countdown.label}`}
        >
          ✕
        </button>
      </div>

      {hasTarget ? (
        <>
          <div
            style={{
              marginTop: 6,
              height: 8,
              background: "var(--bg-sunken)",
              border: "1px solid var(--border-strong)",
            }}
          >
            <div
              style={{
                width: `${ratio * 100}%`,
                height: "100%",
                background: "var(--accent)",
              }}
            />
          </div>
          <p className="faint" style={{ marginTop: 4 }}>
            {countdown.currentValue} of {countdown.targetValue}
          </p>
        </>
      ) : null}
    </div>
  );
}

function CommitRow({
  commit,
  onDelete,
}: {
  commit: CommitLog;
  onDelete: () => void;
}) {
  return (
    <div className="panel" style={{ padding: 8 }}>
      <div className="row" style={{ alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div>{commit.message}</div>
          <div className="faint">
            {commit.filesChanged} files · +{commit.linesAdded} −
            {commit.linesRemoved}
          </div>
        </div>
        <button
          type="button"
          className="btn btn--ghost btn--small"
          onClick={onDelete}
          title="Delete commit log"
          aria-label={`Delete ${commit.message}`}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
