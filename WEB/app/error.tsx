"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/error-monitoring";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportClientError(error, { event: "next.route_error", digest: error.digest ?? null });
  }, [error]);

  return <div className="mx-auto max-w-xl py-24 text-center"><p className="text-sm font-bold uppercase tracking-widest text-red-600">Something went wrong</p><h1 className="mt-3 text-3xl font-black text-stone-900">We couldn&apos;t load this page</h1><p className="mt-3 text-stone-600">Please try again. If the problem continues, check your connection.</p><button onClick={reset} className="gradient-brand mt-8 rounded-xl px-5 py-3 font-bold text-white">Try again</button></div>;
}
