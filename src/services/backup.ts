import { invoke } from "./ipc";

export const backupService = {
  export(): Promise<string> {
    return invoke<string>("export_backup");
  },

  import(json: string): Promise<number> {
    return invoke<number>("import_backup", { json });
  },
};

export function backupFileName(date = new Date()): string {
  return `wolf-backup-${date.toISOString().slice(0, 10)}.json`;
}

export function downloadBackup(json: string, name: string): void {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
