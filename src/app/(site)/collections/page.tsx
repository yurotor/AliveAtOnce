import type { Metadata } from "next";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { COLLECTIONS, getCollectionFacts, getSameBirthdays } from "@/lib/db";
import { FaceCard, FaceGrid, PairCard } from "@/components/FaceCard";

export const metadata: Metadata = { title: "Collections", description: "Themed sets of surprising lifetime overlaps." };

export default async function Collections() {
  "use cache";
  cacheLife("days");
  const previews = await Promise.all(
    COLLECTIONS.map(async (c) => ({
      c,
      facts: c.slug === "same-birthday" ? [] : await getCollectionFacts(c.slug, 3),
      pairs: c.slug === "same-birthday" ? await getSameBirthdays(3) : [],
    })),
  );
  return (
    <div className="pt-10 sm:pt-16">
      <h1 className="font-display text-5xl mb-10">Collections</h1>
      {previews.map(({ c, facts, pairs }) => (
        <section key={c.slug} className="mb-14">
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl">{c.title}</h2>
              <p className="text-muted">{c.blurb}</p>
            </div>
            <Link href={`/collections/${c.slug}`} className="shrink-0 text-sm underline">See all</Link>
          </div>
          <FaceGrid>
            {facts.map((f) => <FaceCard key={f.id} fact={f} />)}
            {pairs.map(([a, b]) => <PairCard key={a.id + b.id} a={a} b={b} caption={`Both born ${a.bornLabel}`} />)}
          </FaceGrid>
        </section>
      ))}
    </div>
  );
}
