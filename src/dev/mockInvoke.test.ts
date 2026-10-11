import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { MOCK_COMMANDS } from "./mockInvoke";

function repoRoot(): string {
  let dir = import.meta.dirname;
  while (!existsSync(join(dir, "package.json"))) {
    const parent = dirname(dir);
    if (parent === dir) throw new Error("no package.json above this test");
    dir = parent;
  }
  return dir;
}

function invokedCommands(): string[] {
  const found = new Set<string>();
  const call = /invoke(?:<[^>]*>)?\(\s*"([a-z0-9_:]+)"/g;

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(path);
        continue;
      }
      if (!/\.tsx?$/.test(entry.name) || entry.name.endsWith(".test.ts")) {
        continue;
      }
      const source = readFileSync(path, "utf8");
      for (const match of source.matchAll(call)) {
        if (match[1] !== undefined) found.add(match[1]);
      }
    }
  };

  walk(join(repoRoot(), "src"));
  return [...found];
}

describe("browser IPC mock", () => {
  const commands = invokedCommands();

  it("finds the commands the frontend invokes", () => {
    expect(commands.length).toBeGreaterThan(40);
  });

  it("covers every command the frontend invokes", () => {
    const missing = commands.filter((command) => !(command in MOCK_COMMANDS));
    expect(missing).toEqual([]);
  });

  it("answers every mock without throwing", () => {
    for (const [command, handler] of Object.entries(MOCK_COMMANDS)) {
      expect(() => handler({}), command).not.toThrow();
    }
  });
});
