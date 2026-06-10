/**
 * Privacy-respecting error monitoring.
 *
 * Captures errors with enough context to fix them, scrubs personal data first
 * (tokens, JWTs, emails — `observability.md` / `security-model.md`), and only
 * transmits when an explicit sink is configured. Without a sink nothing leaves
 * the device; in development the scrubbed event is logged to the console for
 * visibility. A real provider (e.g. Sentry) is wired via `setErrorSink` without
 * touching any call site.
 */

import { Platform } from "react-native";

export interface ErrorEvent {
  name: string;
  message: string;
  stack?: string;
  context?: string;
  fatal: boolean;
  platform: string;
  at: string;
}

type ErrorSink = (event: ErrorEvent) => void;

const _redactions: [RegExp, string][] = [
  [/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]"],
  [/eyJ[A-Za-z0-9._-]{8,}/g, "[token]"],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]"],
];

/** Remove tokens, JWTs, and emails from a string before it is reported. */
export function scrub(text: string): string {
  return _redactions.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), text);
}

let _sink: ErrorSink | null = null;

/** Wire a transport (e.g. Sentry). Pass null to disable transmission. */
export function setErrorSink(sink: ErrorSink | null): void {
  _sink = sink;
}

/** Capture an error: structure it, scrub PII, and report it through the sink. */
export function captureError(
  error: unknown,
  options: { context?: string; fatal?: boolean } = {},
): void {
  const err = error instanceof Error ? error : new Error(String(error));
  const event: ErrorEvent = {
    name: err.name,
    message: scrub(err.message),
    stack: err.stack ? scrub(err.stack).split("\n").slice(0, 12).join("\n") : undefined,
    context: options.context ? scrub(options.context) : undefined,
    fatal: options.fatal ?? false,
    platform: Platform.OS,
    at: new Date().toISOString(),
  };

  if (_sink) {
    try {
      _sink(event);
    } catch {
      // Never let reporting throw.
    }
    return;
  }
  if (__DEV__) {
    // Local visibility only — nothing is transmitted without a configured sink.
    console.warn(`[monitor] ${event.name}: ${event.message}`, {
      context: event.context,
      fatal: event.fatal,
    });
  }
}

interface GlobalErrorUtils {
  getGlobalHandler?: () => ((error: unknown, isFatal?: boolean) => void) | undefined;
  setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
}

/** Route uncaught JS errors and promise rejections through `captureError`. */
export function installGlobalErrorHandler(): void {
  const errorUtils = (globalThis as { ErrorUtils?: GlobalErrorUtils }).ErrorUtils;
  if (errorUtils?.getGlobalHandler && errorUtils.setGlobalHandler) {
    const previous = errorUtils.getGlobalHandler();
    errorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
      captureError(error, { context: "uncaught", fatal: Boolean(isFatal) });
      previous?.(error, isFatal); // preserve default behavior (dev red screen)
    });
  }

  const target = globalThis as { addEventListener?: (type: string, cb: (event: unknown) => void) => void };
  target.addEventListener?.("unhandledrejection", (event: unknown) => {
    const reason = (event as { reason?: unknown }).reason;
    captureError(reason ?? "unhandledrejection", { context: "promise" });
  });
}
