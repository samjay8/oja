"use client";

import { useState } from "react";
import { Button, Field, Kicker, Swatch } from "@/components/ui";

export function SignIn({ slug, onDone }: { slug: string; onDone: () => void }) {
  const [key, setKey] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-12 sm:py-16">
      <Swatch pattern="olokun" as="section">
        <div className="p-6">
          <Kicker>Seller desk · {slug}</Kicker>
          <h1 className="mt-2 font-display text-3xl text-strong">Sign in to your desk</h1>
          <p className="mt-2 text-sm text-muted">Enter the dashboard key for this shop. Demo judges: the key is in the README.</p>
          <form
            className="mt-6 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setErr(null);
              setBusy(true);
              try {
                const res = await fetch(`/api/vendor/${slug}/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key }) });
                if (res.ok) onDone();
                else setErr((await res.json().catch(() => ({}))).error ?? "Sign-in failed");
              } catch {
                setErr("Network error. Try again.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field id="desk-key" label="Dashboard key" type="password" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="current-password" required />
            {err && <p role="alert" className="border-l-2 border-dye pl-3 text-sm text-strong">{err}</p>}
            <Button className="w-full" disabled={busy || !key}>{busy ? "Signing in…" : "Sign in"}</Button>
          </form>
        </div>
      </Swatch>
    </main>
  );
}
