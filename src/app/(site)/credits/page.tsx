import type { Metadata } from "next";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { getPhotoCredits } from "@/lib/db";
import { personPath } from "@/lib/present";

export const metadata: Metadata = { title: "Photo credits", description: "Portraits on Alive At Once come from Wikimedia Commons." };

export default async function Credits() {
  "use cache";
  cacheLife("days");
  const people = await getPhotoCredits();
  return (
    <article className="pt-10 sm:pt-16">
      <h1 className="font-display text-5xl mb-4">Photo credits</h1>
      <p className="mb-10 max-w-prose text-muted">
        Every portrait comes from <a href="https://commons.wikimedia.org" className="underline">Wikimedia Commons</a> via
        the person’s Wikidata entry, under the licence shown. Portraits are cropped to the face and tinted by era.
      </p>
      <ul className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
        {people.map((p) => (
          <li key={p.id}>
            <Link href={personPath(p)} className="font-medium hover:underline">{p.name}</Link>{" "}
            <span className="text-muted">
              by <a href={p.photo!.source} className="underline">{p.photo!.author}</a>,{" "}
              {p.photo!.licenseUrl ? <a href={p.photo!.licenseUrl} className="underline">{p.photo!.license}</a> : p.photo!.license}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
