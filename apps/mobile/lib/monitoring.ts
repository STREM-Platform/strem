import { Platform } from "react-native";

const REDACTIONS: [RegExp, string][] = [
  [/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]"],
  [/eyJ[A-Za-z0-9._-]{8,}/g, "[token]"],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]"],
];

function scrub(text: string): string {
  return REDACTIONS.reduce(
    (value, [pattern, replacement]) => value.replace(pattern, replacement),
    text,
  );
}

/** Log a scrubbed development diagnostic. Nothing is transmitted externally. */
export function captureError(
  error: unknown,
  options: { context?: string; fatal?: boolean } = {},
): void {
  if (!__DEV__) return;
  const value = error instanceof Error ? error : new Error(String(error));
  console.warn(`[monitor] ${value.name}: ${scrub(value.message)}`, {
    context: options.context ? scrub(options.context) : undefined,
    fatal: options.fatal ?? false,
    platform: Platform.OS,
  });
}

interface GlobalErrorUtils {
  getGlobalHandler?: () => ((error: unknown, isFatal?: boolean) => void) | undefined;
  setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
}

export function installGlobalErrorHandler(): void {
  const errorUtils = (globalThis as { ErrorUtils?: GlobalErrorUtils }).ErrorUtils;
  if (errorUtils?.getGlobalHandler && errorUtils.setGlobalHandler) {
    const previous = errorUtils.getGlobalHandler();
    errorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
      captureError(error, { context: "uncaught", fatal: Boolean(isFatal) });
      previous?.(error, isFatal);
    });
  }

  const target = globalThis as {
    addEventListener?: (type: string, callback: (event: unknown) => void) => void;
  };
  target.addEventListener?.("unhandledrejection", (event: unknown) => {
    const reason = (event as { reason?: unknown }).reason;
    captureError(reason ?? "unhandledrejection", { context: "promise" });
  });
}
