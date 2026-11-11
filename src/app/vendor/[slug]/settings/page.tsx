import { Suspense } from "react";
import { Loading } from "@/components/desk/bits";
import { SettingsEditor } from "./settings-editor";

export default function SettingsPage(props: PageProps<"/vendor/[slug]/settings">) {
  return (
    <Suspense fallback={<Loading label="Opening your settings…" layout="form" />}>
      <Settings params={props.params} />
    </Suspense>
  );
}

async function Settings({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <SettingsEditor slug={slug} />;
}
