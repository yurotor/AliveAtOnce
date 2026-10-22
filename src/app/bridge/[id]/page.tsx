import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cacheLife } from "next/cache";
import { getFact, getFactIds, getFactsFor } from "@/lib/db";
import { currentYear } from "@/lib/life";
import { factLine, factPath } from "@/lib/present";
import { FactList, FactView } from "@/components/FactView";

// Pages beyond the prerendered sample render fully on first visit (then cache) —
// we want complete HTML for crawlers rather than a streamed skeleton.
export const instant = false;

export async function generateStaticParams() {
  return (await getFactIds()).slice(0, 50).map((id) => ({ id: String(id) }));
}

export async function generateMetadata({ params }: PageProps<"/bridge/[id]">): Promise<Metadata> {
  const fact = await getFact(Number((await params).id));
  if (!fact) return {};
  const title = `${fact.bridge.name}, ${fact.early.name} and ${fact.late.name}`;
  return {
    title,
    description: factLine(fact),
    alternates: { canonical: factPath(fact) },
    openGraph: { title: factLine(fact), description: "One lifetime. Find more at aliveatonce.app" },
  };
}

export default async function BridgePage({ params }: PageProps<"/bridge/[id]">) {
  "use cache";
  cacheLife("days");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const fact = await getFact(id);
  if (!fact) notFound();
  const related = (await getFactsFor(fact.bridge.id)).filter((f) => f.id !== fact.id);
  const now = currentYear();
  return (
    <>
      <section className="pt-10 sm:pt-16 pb-14">
        <FactView fact={fact} now={now} />
      </section>
      {related.length > 0 && (
        <section className="py-10 border-t border-rule">
          <h2 className="font-display text-3xl mb-6">More with {fact.bridge.name}</h2>
          <FactList facts={related} now={now} />
        </section>
      )}
    </>
  );
}
