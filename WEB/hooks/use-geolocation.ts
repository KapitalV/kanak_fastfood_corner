"use client";

import { useCallback, useState } from "react";

export function useGeolocation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPosition = useCallback(
    (): Promise<GeolocationPosition> =>
      new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("Geolocation is not supported by your browser."));
          return;
        }
        setLoading(true);
        setError(null);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLoading(false);
            resolve(pos);
          },
          (err) => {
            setLoading(false);
            const msg =
              err.code === 1
                ? "Location access denied. Please enable it in browser settings."
                : err.code === 2
                ? "Location unavailable. Please try again."
                : "Location request timed out.";
            setError(msg);
            reject(new Error(msg));
          },
          { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
        );
      }),
    [],
  );

  return { getPosition, loading, error };
}
