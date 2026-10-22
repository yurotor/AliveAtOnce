import { CARD_SIZE, textCard } from "@/lib/card";

export const size = CARD_SIZE;
export const contentType = "image/png";
export const alt = "Alive At Once";

const life = (name: string, b: number, d: number | null) => ({
  name, bornLabel: String(b), diedLabel: d ? String(d) : null, bLo: b, bHi: b + 0.9, dLo: d, dHi: d ? d + 0.9 : null,
});

export default async function Image() {
  return textCard("Alive At Once", "Picasso was alive at the same time as Darwin… and Eminem.", [
    life("Charles Darwin", 1809, 1882),
    life("Pablo Picasso", 1881, 1973),
    life("Eminem", 1972, null),
  ]);
}
