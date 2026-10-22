import { searchPeople } from "@/lib/db";
import { lifeYears } from "@/lib/present";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const people = await searchPeople(q.slice(0, 60));
  return Response.json(
    people.map((p) => ({ slug: p.slug, name: p.name, years: lifeYears(p), description: p.description })),
  );
}
