import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cacheLife } from "next/cache";
import { COLLECTIONS, getCollectionFacts, getSameBirthdays } from "@/lib/db";
import { FaceCard, FaceGrid, PairCard } from "@/components/FaceCard";

export const instant = false;

export function generateStaticParams() {
  return COLLECTIONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/collections/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = COLLECTIONS.find((x) => x.slug === slug);
  return c ? { title: c.title, description: c.blurb } : {};
}

export default async function CollectionPage({ params }: PageProps<"/collections/[slug]">) {
  "use cache";
  cacheLife("days");
  const { slug } = await params;
  const c = COLLECTIONS.find((x) => x.slug === slug);
  if (!c) notFound();
  const [facts, pairs] = await Promise.all([
    c.slug === "same-birthday" ? [] : getCollectionFacts(c.slug, 24),
    c.slug === "same-birthday" ? getSameBirthdays(24) : [],
  ]);
  return (
    <div className="pt-10 sm:pt-16">
      <h1 className="font-display text-5xl">{c.title}</h1>
      <p className="mt-3 mb-10 text-muted">{c.blurb}</p>
      <FaceGrid>
        {facts.map((f) => <FaceCard key={f.id} fact={f} />)}
        {pairs.map(([a, b]) => <PairCard key={a.id + b.id} a={a} b={b} caption={`Both born ${a.bornLabel}`} />)}
      </FaceGrid>
    </div>
  );
}
