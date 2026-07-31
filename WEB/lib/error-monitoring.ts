export type ErrorMonitoringContext = Readonly<Record<string, string | number | boolean | null | undefined>>;
export type ErrorMonitoringHook = (error: unknown, context: ErrorMonitoringContext) => void | Promise<void>;

declare global {
  // An observability integration can install this hook during application bootstrap.
  // It intentionally receives only the curated context assembled by callers.
  var __kanakReportError: ErrorMonitoringHook | undefined;
}

async function report(error: unknown, context: ErrorMonitoringContext) {
  try {
    await globalThis.__kanakReportError?.(error, context);
  } catch {
    // Error reporting must never interfere with the user-facing request.
  }
}

export function reportServerError(error: unknown, context: ErrorMonitoringContext) {
  return report(error, context);
}

export function reportClientError(error: unknown, context: ErrorMonitoringContext) {
  return report(error, context);
}
