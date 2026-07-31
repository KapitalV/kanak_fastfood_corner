"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/error-monitoring";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportClientError(error, { event: "next.global_error", digest: error.digest ?? null });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="mx-auto max-w-xl px-4 py-24 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-red-600">Application error</p>
          <h1 className="mt-3 text-3xl font-black text-stone-900">We couldn&apos;t load Kanak Foods</h1>
          <button onClick={reset} className="gradient-brand mt-8 rounded-xl px-5 py-3 font-bold text-white">Try again</button>
        </main>
      </body>
    </html>
  );
}
