import { Suspense } from "react";
import { ChannelsDesk } from "./channels-desk";

export default function ChannelsPage(props: PageProps<"/vendor/[slug]/channels">) {
  return (
    <Suspense fallback={<p className="px-4 py-10 text-sm text-muted sm:px-6">Loading…</p>}>
      <Channels params={props.params} />
    </Suspense>
  );
}

async function Channels({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ChannelsDesk slug={slug} />;
}
