"use client";

import { useCallback, useEffect, useState } from "react";

/** Poll a JSON endpoint. `reload()` fetches now. A null url pauses polling. */
export function usePoll<T>(url: string | null, ms: number) {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!url) return;
    let alive = true;
    const tick = () =>
      fetch(url, { cache: "no-store" })
        .then(async (r) => {
          if (!alive) return;
          setStatus(r.status);
          if (r.ok) setData((await r.json()) as T);
        })
        .catch(() => {});
    tick();
    const t = setInterval(tick, ms);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [url, ms, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, status, reload, setData };
}
