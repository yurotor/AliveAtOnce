import { getFactBySlug } from "@/lib/db";
import { storyImage } from "@/lib/card";

/** The 9:16 card (1080×1920) for TikTok and Instagram stories. */
export async function GET(_req: Request, { params }: RouteContext<"/b/[slug]/story">) {
  const fact = await getFactBySlug((await params).slug);
  if (!fact) return new Response("Not found", { status: 404 });
  const res = await storyImage(fact);
  res.headers.set("Cache-Control", "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400");
  return res;
}
