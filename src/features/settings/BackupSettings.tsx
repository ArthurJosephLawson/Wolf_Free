import { useRef, useState } from "react";
import { Panel, Modal } from "../../components/ui";
import { toAppError } from "../../lib/errors";
import { backupFileName, backupService, downloadBackup } from "../../services/backup";
import { useUiStore } from "../../app/uiStore";

export function BackupSettings() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [pending, setPending] = useState<{ name: string; json: string } | null>(
    null,
  );
  const pushToast = useUiStore((s) => s.pushToast);

  const runExport = async () => {
    try {
      const json = await backupService.export();
      downloadBackup(json, backupFileName());
      pushToast({
        tone: "success",
        title: "Backup saved",
        body: "Every table written to one JSON file.",
      });
    } catch (error) {
      pushToast({
        tone: "error",
        title: "Export failed",
        body: toAppError(error).message,
      });
    }
  };

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const json = await file.text();
    setPending({ name: file.name, json });
  };

  const runImport = async () => {
    if (!pending) return;
    try {
      const inserted = await backupService.import(pending.json);
      pushToast({
        tone: "success",
        title: "Backup imported",
        body: `${inserted} rows added.`,
      });
    } catch (error) {
      pushToast({
        tone: "error",
        title: "Import failed",
        body: toAppError(error).message,
      });
    }
    setPending(null);
  };

  return (
    <Panel title="Backup">
      <div className="row">
        <button
          type="button"
          className="btn btn--small"
          onClick={() => void runExport()}
        >
          Export
        </button>
        <button
          type="button"
          className="btn btn--small"
          onClick={() => fileRef.current?.click()}
        >
          Import
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          onChange={(event) => void onFile(event)}
        />
      </div>
      <p className="faint" style={{ marginTop: 8 }}>
        Export writes every table to one JSON file. Import adds records from a
        file; nothing you already have is deleted.
      </p>

      {pending ? (
        <Modal
          open
          title="Import this file?"
          onClose={() => setPending(null)}
          footer={
            <>
              <button
                type="button"
                className="btn btn--small"
                onClick={() => setPending(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--primary btn--small"
                onClick={() => void runImport()}
              >
                Import
              </button>
            </>
          }
        >
          <p>
            Add the records from <strong>{pending.name}</strong>? Existing
            records stay untouched.
          </p>
        </Modal>
      ) : null}
    </Panel>
  );
}
