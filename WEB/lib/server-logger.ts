import { reportServerError } from "@/lib/error-monitoring";

type LogValue = string | number | boolean | null | undefined;
type LogContext = Record<string, LogValue>;

const FORBIDDEN_FIELD = /secret|signature|payload|password|token|authorization|cookie/i;

function safeContext(context: LogContext): LogContext {
  return Object.fromEntries(
    Object.entries(context).filter(([key, value]) => !FORBIDDEN_FIELD.test(key) && value !== undefined),
  );
}

export function logServerEvent(event: string, context: LogContext = {}) {
  console.info(JSON.stringify({ level: "info", event, ...safeContext(context) }));
}

export function logServerError(event: string, error: unknown, context: LogContext = {}) {
  const safe = safeContext(context);
  console.error(JSON.stringify({
    level: "error",
    event,
    errorName: error instanceof Error ? error.name : "UnknownError",
    ...safe,
  }));
  void reportServerError(error, { event, ...safe });
}
