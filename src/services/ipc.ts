import { invoke as tauriInvoke } from "@tauri-apps/api/core";

function hasTauriRuntime(): boolean {
  return (
    typeof (globalThis as { __TAURI_INTERNALS__?: unknown })
      .__TAURI_INTERNALS__ === "object"
  );
}

export const isDesktop = hasTauriRuntime();

function unavailable(command: string): Promise<never> {
  return Promise.reject(
    new Error(
      `Wolf's native layer is not available (command: ${command}). Run the app with \`npm run dev\` so the Tauri shell is present.`,
    ),
  );
}

export function invoke<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  if (!isDesktop) return unavailable(command);
  return tauriInvoke<T>(command, args) as Promise<T>;
}
