import { getFactBySlug } from "@/lib/db";

/** One bridge as JSON, for the feed to load the next cards. */
export async function GET(_req: Request, { params }: RouteContext<"/api/b/[slug]">) {
  const fact = await getFactBySlug((await params).slug);
  if (!fact) return Response.json(null, { status: 404 });
  return Response.json(fact, {
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400" },
  });
}
