import type { Instrumentation } from "next";
import { reportServerError } from "@/lib/error-monitoring";

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  await reportServerError(error, {
    event: "next.request_error",
    method: request.method,
    path: request.path,
    routePath: context.routePath,
    routeType: context.routeType,
  });
};
