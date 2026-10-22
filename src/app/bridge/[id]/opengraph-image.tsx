import { getFact } from "@/lib/db";
import { CARD_SIZE, factCard, textCard } from "@/lib/card";

export const size = CARD_SIZE;
export const contentType = "image/png";
export const alt = "Three overlapping lifetimes on a timeline";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const fact = await getFact(Number((await params).id));
  return fact ? factCard(fact) : textCard("Alive At Once", "Whose lifetimes overlapped?");
}
