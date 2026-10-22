import type { MetadataRoute } from "next";
import { getFactSlugs, getSitemapPage, COLLECTIONS } from "@/lib/db";
import { SITE_URL } from "@/lib/present";

const PEOPLE_PER_MAP = 10_000;
export const PEOPLE_MAPS = 5; // 50k people

// Sitemap 0: pages + bridges. Sitemaps 1–5: person pages, most famous first.
export async function generateSitemaps() {
  return Array.from({ length: PEOPLE_MAPS + 1 }, (_, id) => ({ id }));
}

export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const id = Number(await props.id);
  if (id === 0) {
    const facts = await getFactSlugs();
    return [
      { url: SITE_URL, changeFrequency: "daily", priority: 1 },
      { url: `${SITE_URL}/search` },
      { url: `${SITE_URL}/about` },
      { url: `${SITE_URL}/collections` },
      ...COLLECTIONS.map((c) => ({ url: `${SITE_URL}/collections/${c.slug}` })),
      ...facts.map((slug) => ({ url: `${SITE_URL}/b/${slug}` })),
    ];
  }
  const people = await getSitemapPage(id - 1, PEOPLE_PER_MAP);
  return people.map((p) => ({ url: `${SITE_URL}/p/${p.slug}` }));
}
