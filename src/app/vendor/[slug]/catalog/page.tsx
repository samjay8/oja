import { Suspense } from "react";
import { CatalogEditor } from "./catalog-editor";

export default function CatalogPage(props: PageProps<"/vendor/[slug]/catalog">) {
  return (
    <Suspense fallback={<p className="px-4 py-10 text-sm text-muted sm:px-6">Loading…</p>}>
      <Catalog params={props.params} />
    </Suspense>
  );
}

async function Catalog({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CatalogEditor slug={slug} />;
}
