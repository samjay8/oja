import { Suspense } from "react";
import { Loading } from "@/components/desk/bits";
import { VendorInbox } from "./vendor-inbox";

export default function VendorPage(props: PageProps<"/vendor/[slug]">) {
  return (
    <Suspense fallback={<Loading label="Opening your inbox…" layout="inbox" />}>
      <Inbox params={props.params} />
    </Suspense>
  );
}

async function Inbox({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <VendorInbox slug={slug} />;
}
