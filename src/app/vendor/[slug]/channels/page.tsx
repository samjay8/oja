import { Suspense } from "react";
import { Loading } from "@/components/desk/bits";
import { ChannelsDesk } from "./channels-desk";

export default function ChannelsPage(props: PageProps<"/vendor/[slug]/channels">) {
  return (
    <Suspense fallback={<Loading label="Opening your channels…" />}>
      <Channels params={props.params} />
    </Suspense>
  );
}

async function Channels({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ChannelsDesk slug={slug} />;
}
