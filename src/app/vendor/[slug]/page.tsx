import { Suspense } from "react";
import { VendorInbox } from "./vendor-inbox";

export default function VendorPage(props: PageProps<"/vendor/[slug]">) {
  return (
    <Suspense fallback={<p className="p-8 text-muted">Loading inbox…</p>}>
      <Inbox params={props.params} />
    </Suspense>
  );
}

async function Inbox({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <VendorInbox slug={slug} />;
}
