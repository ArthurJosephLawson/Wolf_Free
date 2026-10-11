import { afterEach, describe, expect, it, vi } from "vitest";
import { backupFileName, downloadBackup } from "./backup";

describe("backup file names", () => {
  it("are dated", () => {
    expect(backupFileName(new Date("2026-10-07T12:00:00Z"))).toBe(
      "wolf-backup-2026-10-07.json",
    );
  });
});

describe("backup download", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("saves the json under the given name", () => {
    const createObjectURL = vi.fn(() => "blob:wolf");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    downloadBackup('{"formatVersion":1}', "wolf-backup-2026-10-07.json");

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:wolf");
    expect(click).toHaveBeenCalledTimes(1);
  });
});
