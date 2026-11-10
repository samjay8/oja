"use client";

import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";

/** Poll a JSON endpoint. `reload()` fetches now. A null url pauses polling. */
export function usePoll<T>(url: string | null, ms: number) {
  const [data, setRaw] = useState<T | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [nonce, setNonce] = useState(0);
  // Bumped by setData so a poll that started earlier can't overwrite fresher data.
  const gen = useRef(0);
  const last = useRef("");

  useEffect(() => {
    if (!url) return;
    let alive = true;
    const tick = () => {
      const started = gen.current;
      return fetch(url, { cache: "no-store" })
        .then(async (r) => {
          if (!alive || started !== gen.current) return;
          setStatus(r.status);
          if (!r.ok) return;
          const text = await r.text();
          if (!alive || started !== gen.current || text === last.current) return;
          last.current = text;
          setRaw(JSON.parse(text) as T);
        })
        .catch(() => {});
    };
    tick();
    const t = setInterval(tick, ms);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [url, ms, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setData = useCallback((v: SetStateAction<T | null>) => {
    gen.current += 1;
    last.current = "";
    setRaw(v);
  }, []);
  return { data, status, reload, setData };
}
