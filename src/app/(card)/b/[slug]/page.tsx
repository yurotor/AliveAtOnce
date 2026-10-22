import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cacheLife } from "next/cache";
import { getFactBySlug, getFeed, getFeedSlugs } from "@/lib/db";
import { factPath, moments, plainHeadline } from "@/lib/present";
import { BridgeFeed } from "@/components/feed/BridgeFeed";

// Bridges beyond the prerendered sample render fully on first visit (then cache) —
// we want complete HTML for crawlers rather than a streamed skeleton.
export const instant = false;

export async function generateStaticParams() {
  return (await getFeedSlugs()).slice(0, 50).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/b/[slug]">): Promise<Metadata> {
  const fact = await getFactBySlug((await params).slug);
  if (!fact) return {};
  const m = moments(fact);
  const description = fact.oneLiner ?? `${m.earlyDied.fact} ${m.lateBorn.fact}`;
  return {
    title: { absolute: `${plainHeadline(fact)} · Alive At Once` },
    description,
    alternates: { canonical: factPath(fact) },
    openGraph: { title: plainHeadline(fact), description: "One lifetime. Find more at aliveatonce.app" },
  };
}

export default async function BridgePage({ params }: PageProps<"/b/[slug]">) {
  "use cache";
  cacheLife("days");
  const fact = await getFactBySlug((await params).slug);
  if (!fact) notFound();
  return <BridgeFeed initial={fact} feed={await getFeed()} />;
}
