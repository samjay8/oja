import { Suspense } from "react";
import { SettingsEditor } from "./settings-editor";

export default function SettingsPage(props: PageProps<"/vendor/[slug]/settings">) {
  return (
    <Suspense fallback={<p className="px-4 py-10 text-sm text-muted sm:px-6">Loading…</p>}>
      <Settings params={props.params} />
    </Suspense>
  );
}

async function Settings({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <SettingsEditor slug={slug} />;
}
