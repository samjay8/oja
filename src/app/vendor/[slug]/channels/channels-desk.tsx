"use client";

import { useState } from "react";
import { Button, CHANNEL_LABEL, ChannelGlyph, Field, Kicker, Stamp, Swatch, Tag } from "@/components/ui";
import { CopyLine, DeskHeading, Loading, Notice, sendJson, Toggle, useDeskData, useOrigin } from "@/components/desk/bits";
import { SignIn } from "@/components/desk/sign-in";

type Meta = "whatsapp" | "messenger" | "instagram";
type Connection = { id: string; channel: Meta; externalId: string; displayName: string | null; active: boolean; tokenHint: string; createdAt: string };
type ChannelsData = { webhookUrl: string; verifyTokenConfigured: boolean; appSecretConfigured: boolean; channels: Connection[] };

const SPEC: Record<Meta, { product: string; idLabel: string; idHint: string; tokenLabel: string; tokenHint: string; steps: string[] }> = {
  whatsapp: {
    product: "WhatsApp",
    idLabel: "Phone number ID",
    idHint: "WhatsApp › API Setup, under your test or business number. Not the phone number itself.",
    tokenLabel: "Permanent access token",
    tokenHint: "A system-user token from Business Settings with whatsapp_business_messaging. Temporary tokens expire in 24 hours.",
    steps: [
      "In Meta for Developers, create a Business app and add the WhatsApp product.",
      "Under WhatsApp › Configuration, set the callback URL to the webhook URL below and the verify token from your server env.",
      "Subscribe the webhook to the messages field.",
      "Copy the Phone number ID and a permanent (system-user) access token, then paste them here.",
    ],
  },
  messenger: {
    product: "Messenger",
    idLabel: "Facebook Page ID",
    idHint: "Your Page › About › Page transparency, or Messenger › Settings in the app.",
    tokenLabel: "Page access token",
    tokenHint: "Generated in Messenger › Settings › Access tokens for this Page (pages_messaging).",
    steps: [
      "In Meta for Developers, open your app and add the Messenger product.",
      "Under Messenger › Settings › Webhooks, set the callback URL to the webhook URL below and the verify token from your server env.",
      "Subscribe your Page to the messages field.",
      "Generate a Page access token, then paste the Page ID and token here.",
    ],
  },
  instagram: {
    product: "Instagram",
    idLabel: "Instagram professional account ID",
    idHint: "The numeric ID of your Business or Creator account, shown in the app's Instagram › API setup.",
    tokenLabel: "Instagram access token",
    tokenHint: "Generated in Instagram › API setup with Instagram login (instagram_business_manage_messages).",
    steps: [
      "Switch your Instagram account to a professional (Business or Creator) account.",
      "In Meta for Developers, add the Instagram product to your app.",
      "Under Instagram › Webhooks, set the callback URL to the webhook URL below and the verify token from your server env, then subscribe to messages.",
      "Generate an access token for the account, then paste the account ID and token here.",
    ],
  },
};

export function ChannelsDesk({ slug }: { slug: string }) {
  const { data, status, reload } = useDeskData<ChannelsData>(`/api/vendor/${slug}/channels`);
  const origin = useOrigin();
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const api = `/api/vendor/${slug}/channels`;

  if (status === 401) return <SignIn slug={slug} onDone={reload} />;
  if (status === null) return <Loading label="Loading channels…" />;
  const unavailable = !data;
  const shopUrl = origin ? `${origin}/shop/${slug}` : "";

  async function run(fn: () => Promise<{ ok?: boolean; detail?: string } | unknown>, ok: string) {
    setMsg(null);
    try {
      await fn();
      setMsg({ tone: "ok", text: ok });
      reload();
      return true;
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof Error ? e.message : "Failed" });
      return false;
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-6 sm:px-6">
      <DeskHeading kicker="Channels" title="Launch Oja where buyers chat" />
      <p className="max-w-2xl text-sm text-muted">
        One agent, one inbox. Every channel you connect lands in your Inbox with the same catalog, price floors, copilot drafts and PayPal checkout.
      </p>

      {unavailable && <Notice tone="error">Channel setup isn&apos;t reachable right now ({status || "network error"}). Web chat still works.</Notice>}
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      {data && (
        <Swatch as="section" pattern="grid">
          <div className="space-y-3 p-4 sm:p-5">
            <Kicker>Meta webhook (shared by all three channels)</Kicker>
            <CopyLine label="Callback URL" value={data.webhookUrl} />
            <div className="flex flex-wrap gap-2">
              {data.verifyTokenConfigured ? <Stamp tilt={false} filled>Verify token set</Stamp> : <Tag dashed>Verify token missing in server env</Tag>}
              {data.appSecretConfigured ? <Stamp tilt={false} filled>App secret set</Stamp> : <Tag dashed>App secret missing in server env</Tag>}
            </div>
            <p className="text-xs text-muted">Paste the verify token from your server environment (see .env.example) into Meta. The app secret lets Oja check every webhook really came from Meta.</p>
          </div>
        </Swatch>
      )}

      <ul className="grid gap-4 lg:grid-cols-2">
        <Swatch as="li" pattern="dots">
          <div className="space-y-3 p-4 sm:p-5">
            <ChannelTitle kind="web" />
            <div className="flex flex-wrap gap-2"><Stamp filled tilt={false}>Always on</Stamp><Tag>No setup</Tag></div>
            <p className="text-sm text-muted">Your hosted shop page with Oja built in. Share it in your bio, status or broadcast lists.</p>
            <CopyLine label="Shop link" value={shopUrl} />
          </div>
        </Swatch>
        {(["whatsapp", "messenger", "instagram"] as const).map((k) => (
          <ChannelCard
            key={k}
            kind={k}
            disabled={unavailable}
            connections={data?.channels.filter((c) => c.channel === k) ?? []}
            onConnect={(body) => run(() => sendJson(api, "POST", { channel: k, ...body }), `${CHANNEL_LABEL[k]} connected. Send a test message from another account.`)}
            onActive={(id, active) => run(() => sendJson(api, "PATCH", { id, active }), active ? `${CHANNEL_LABEL[k]} is live.` : `${CHANNEL_LABEL[k]} is paused. Messages won't be answered.`)}
            onDisconnect={(id) => run(() => sendJson(`${api}?id=${encodeURIComponent(id)}`, "DELETE"), `${CHANNEL_LABEL[k]} disconnected and its token deleted.`)}
            onTest={async (id) => {
              setMsg(null);
              try {
                const r = await sendJson<{ ok: boolean; detail: string }>(`${api}/test`, "POST", { id });
                setMsg({ tone: r.ok ? "ok" : "error", text: `${CHANNEL_LABEL[k]} test: ${r.detail}` });
              } catch (e) {
                setMsg({ tone: "error", text: e instanceof Error ? e.message : "Test failed" });
              }
            }}
          />
        ))}
      </ul>

      <Notice>
        Messenger and Instagram run in Meta development mode until App Review; WhatsApp test numbers reach up to 5 verified recipients.
      </Notice>
      <p className="border border-dashed border-line-strong p-4 text-sm text-muted">
        <span className="font-semibold text-strong">More channels coming</span> (Telegram, TikTok…) based on demand.
      </p>
    </main>
  );
}

function ChannelTitle({ kind }: { kind: keyof typeof CHANNEL_LABEL }) {
  return (
    <h2 className="flex items-center gap-2 font-display text-2xl text-strong">
      <span className="inline-flex size-9 items-center justify-center border border-dye text-dye"><ChannelGlyph kind={kind} className="size-5" /></span>
      {CHANNEL_LABEL[kind]}
    </h2>
  );
}

function ChannelCard({ kind, connections, disabled, onConnect, onActive, onDisconnect, onTest }: {
  kind: Meta; connections: Connection[]; disabled: boolean;
  onConnect: (b: { externalId: string; displayName?: string; accessToken: string }) => Promise<boolean>;
  onActive: (id: string, active: boolean) => Promise<boolean>;
  onDisconnect: (id: string) => Promise<boolean>;
  onTest: (id: string) => Promise<void>;
}) {
  const spec = SPEC[kind];
  const [open, setOpen] = useState(false);
  const [externalId, setExternalId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const connected = connections.length > 0;
  const showForm = !connected || open;

  const wrap = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  return (
    <Swatch as="li" pattern={connected ? "olokun" : undefined}>
      <div className="space-y-4 p-4 sm:p-5">
        <ChannelTitle kind={kind} />
        <div className="flex flex-wrap gap-2">
          {connected
            ? connections.some((c) => c.active) ? <Stamp filled tilt={false}>Live</Stamp> : <Stamp tilt={false}>Paused</Stamp>
            : <Tag dashed>Not connected</Tag>}
          {kind !== "whatsapp" && <Tag dashed>Dev mode until App Review</Tag>}
        </div>

        {connections.map((c) => (
          <div key={c.id} className="space-y-3 border border-line bg-sunk p-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-strong">{c.displayName ?? spec.product}</p>
              <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-[11px]">
                <dt className="text-muted">ID</dt><dd className="truncate text-strong">{c.externalId}</dd>
                <dt className="text-muted">Token</dt><dd className="text-strong">{c.tokenHint}</dd>
                <dt className="text-muted">Since</dt><dd className="text-strong">{new Date(c.createdAt).toLocaleDateString()}</dd>
              </dl>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Toggle checked={c.active} label={`${spec.product} ${c.externalId} active`} disabled={busy !== null} onChange={(v) => wrap(`a${c.id}`, () => onActive(c.id, v))} />
              <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => wrap(`t${c.id}`, () => onTest(c.id))}>{busy === `t${c.id}` ? "Testing…" : "Test"}</Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy !== null}
                onClick={() => confirm(`Disconnect ${spec.product}? Oja stops answering there and the token is deleted.`) && wrap(`d${c.id}`, () => onDisconnect(c.id))}
              >
                Disconnect
              </Button>
            </div>
          </div>
        ))}

        <details className="group border-t border-line pt-3" open={!connected}>
          <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-wider text-muted hover:text-strong">Setup steps</summary>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-text marker:font-mono marker:text-muted">
            {spec.steps.map((s) => <li key={s}>{s}</li>)}
          </ol>
        </details>

        {connected && !open && (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Connect another {spec.product === "Messenger" ? "Page" : "account"}</Button>
        )}
        {showForm && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              wrap("connect", async () => {
                const ok = await onConnect({ externalId: externalId.trim(), accessToken: token.trim(), ...(displayName.trim() ? { displayName: displayName.trim() } : {}) });
                if (ok) {
                  setExternalId("");
                  setDisplayName("");
                  setToken("");
                  setOpen(false);
                }
              });
            }}
          >
            <Field id={`${kind}-ext`} label={spec.idLabel} hint={spec.idHint} value={externalId} onChange={(e) => setExternalId(e.target.value)} required inputMode="numeric" autoComplete="off" className="font-mono" disabled={disabled} />
            <Field id={`${kind}-name`} label="Display name (optional)" hint="Only you see this." value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80} disabled={disabled} />
            <Field id={`${kind}-token`} label={spec.tokenLabel} hint={`${spec.tokenHint} Stored encrypted; only the last characters are ever shown.`} type="password" value={token} onChange={(e) => setToken(e.target.value)} required autoComplete="off" spellCheck={false} className="font-mono" disabled={disabled} />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={disabled || busy !== null || !externalId.trim() || !token.trim()}>{busy === "connect" ? "Connecting…" : `Connect ${spec.product}`}</Button>
              {connected && <Button size="sm" type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>}
            </div>
          </form>
        )}
      </div>
    </Swatch>
  );
}
