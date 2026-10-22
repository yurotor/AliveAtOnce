import { getDailyFact } from "@/lib/db";
import { CARD_SIZE, ogImage, textCard } from "@/lib/card";

export const size = CARD_SIZE;
export const contentType = "image/png";
export const alt = "Today’s bridge on Alive At Once";

export default async function Image() {
  const daily = await getDailyFact();
  return daily ? ogImage(daily.fact) : textCard("Alive At Once", "Whose lifetimes overlapped?");
}
