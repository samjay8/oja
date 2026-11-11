"use client";

import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";

// Polling is the app's biggest steady load (every open chat and seller inbox), so it is
// polite: it pauses while the tab is hidden, backs off from `ms` to MAX_MS while nothing
// changes, snaps back to `ms` on a change, a reload(), setData() or the tab coming back,
// and jitters each wait so a room full of browsers doesn't poll in lockstep.
const MAX_MS = 15_000;
const STEADY_POLLS = 3; // unchanged polls at full speed before backing off
const BACKOFF = 1.5;

/** Poll a JSON endpoint. `reload()` fetches now. A null url pauses polling. */
export function usePoll<T>(url: string | null, ms: number) {
  const [data, setRaw] = useState<T | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [nonce, setNonce] = useState(0);
  // Bumped by setData so a poll that started earlier can't overwrite fresher data.
  const gen = useRef(0);
  const last = useRef("");
  // Set by the running effect: poll again soon at full speed.
  const kick = useRef<() => void>(() => {});

  useEffect(() => {
    if (!url) return;
    let alive = true;
    let stopped = false; // signed out (401): wait for reload()
    let timer: ReturnType<typeof setTimeout> | undefined;
    let delay = ms;
    let unchanged = 0;

    const schedule = (wait: number) => {
      clearTimeout(timer);
      if (!alive || stopped || document.hidden) return;
      timer = setTimeout(tick, wait * (0.85 + Math.random() * 0.3));
    };
    const speedUp = () => { delay = ms; unchanged = 0; };
    const slowDown = () => {
      unchanged += 1;
      if (unchanged > STEADY_POLLS) delay = Math.min(Math.max(ms, MAX_MS), delay * BACKOFF);
    };

    function tick() {
      const started = gen.current;
      return fetch(url!, { cache: "no-store" })
        .then(async (r) => {
          if (!alive) return;
          if (started !== gen.current) return speedUp();
          setStatus(r.status);
          if (r.status === 401) { stopped = true; return; }
          if (!r.ok) return slowDown();
          const text = await r.text();
          if (!alive || started !== gen.current) return speedUp();
          if (text === last.current) return slowDown();
          last.current = text;
          setRaw(JSON.parse(text) as T);
          speedUp();
        })
        .catch(() => slowDown())
        .finally(() => schedule(delay));
    }

    const onVisible = () => {
      if (document.hidden) { clearTimeout(timer); return; }
      speedUp();
      clearTimeout(timer);
      if (!stopped) tick();
    };
    kick.current = () => { speedUp(); schedule(ms); };
    document.addEventListener("visibilitychange", onVisible);
    if (!document.hidden) tick();

    return () => {
      alive = false;
      clearTimeout(timer);
      kick.current = () => {};
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [url, ms, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setData = useCallback((v: SetStateAction<T | null>) => {
    gen.current += 1;
    last.current = "";
    setRaw(v);
    // Something just happened (e.g. the buyer sent a message): watch closely again.
    kick.current();
  }, []);
  return { data, status, reload, setData };
}
