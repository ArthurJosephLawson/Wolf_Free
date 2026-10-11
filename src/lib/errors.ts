import type { WolfErrorShape } from "../types";

class WolfAppError extends Error {
  readonly kind: string;

  constructor(kind: string, message: string) {
    super(message);
    this.name = "WolfAppError";
    this.kind = kind;
  }

  get isNotFound(): boolean {
    return this.kind === "not_found";
  }
}

export function toAppError(
  unknown: unknown,
  fallback = "Wolf hit an unexpected problem.",
): WolfAppError {
  if (unknown instanceof WolfAppError) return unknown;

  if (typeof unknown === "object" && unknown !== null) {
    const candidate = unknown as Partial<WolfErrorShape> & {
      message?: unknown;
    };
    if (
      typeof candidate.message === "string" &&
      typeof candidate.kind === "string"
    ) {
      return new WolfAppError(candidate.kind, candidate.message);
    }
    if (typeof candidate.message === "string") {
      return new WolfAppError("unknown", candidate.message);
    }
  }

  if (unknown instanceof Error) {
    return new WolfAppError("unknown", `${fallback} (${unknown.message})`);
  }

  return new WolfAppError("unknown", fallback);
}
