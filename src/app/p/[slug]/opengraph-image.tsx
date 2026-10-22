import { getOverlaps, getPerson } from "@/lib/db";
import { CARD_SIZE, textCard } from "@/lib/card";
import { lifeYears } from "@/lib/present";

export const size = CARD_SIZE;
export const contentType = "image/png";
export const alt = "A lifetime alongside famous contemporaries";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getPerson((await params).slug);
  if (!p) return textCard("Alive At Once", "Whose lifetimes overlapped?");
  const { before, after } = await getOverlaps(p, 1);
  const years = p.dLo === null ? `Born ${lifeYears(p).replace(/–$/, "")}` : lifeYears(p);
  return textCard(p.name, `${years}. Who was alive at the same time?`, [
    ...before.slice(0, 1),
    p,
    ...after.slice(0, 1),
  ]);
}
