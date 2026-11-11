import { Suspense } from "react";
import { Loading } from "@/components/desk/bits";
import { CatalogEditor } from "./catalog-editor";

export default function CatalogPage(props: PageProps<"/vendor/[slug]/catalog">) {
  return (
    <Suspense fallback={<Loading label="Opening your catalog…" />}>
      <Catalog params={props.params} />
    </Suspense>
  );
}

async function Catalog({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CatalogEditor slug={slug} />;
}
