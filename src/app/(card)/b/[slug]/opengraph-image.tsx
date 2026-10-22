import { getFactBySlug } from "@/lib/db";
import { CARD_SIZE, ogImage, textCard } from "@/lib/card";

export const size = CARD_SIZE;
export const contentType = "image/png";
export const alt = "Three overlapping portraits: one lifetime that touched both the others";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const fact = await getFactBySlug((await params).slug);
  return fact ? ogImage(fact) : textCard("Alive At Once", "Whose lifetimes overlapped?");
}
