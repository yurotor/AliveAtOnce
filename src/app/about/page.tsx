import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "About", description: "How Alive At Once finds surprising lifetime overlaps." };

export default function About() {
  return (
    <article className="pt-10 sm:pt-16 max-w-prose space-y-5 leading-relaxed">
      <h1 className="font-display text-5xl mb-8">About</h1>
      <p>
        Alive At Once is about the surprising ways famous lives overlapped. Pablo Picasso was alive at the
        same time as Charles Darwin, and he was still alive when Eminem was born. One lifetime can span
        worlds that feel centuries apart.
      </p>
      <h2 className="font-display text-2xl pt-4">Where the dates come from</h2>
      <p>
        Birth and death dates come from <a className="underline" href="https://www.wikidata.org">Wikidata</a>.
        People are ranked by how many Wikipedia language editions cover them and how often their English
        article is read. When sources disagree or a date is only known to the year, we only claim an
        overlap if it holds for every possible reading of the dates.
      </p>
      <h2 className="font-display text-2xl pt-4">How bridges are picked</h2>
      <p>
        A bridge is one life that overlapped two people who never overlapped each other. We generate
        candidates from the data, an AI model rates how surprising each one is, and another writes the
        one-line summary using only the dates shown.
      </p>
      <p>Spotted a wrong date? Fix it on Wikidata and it will flow through on the next update.</p>
      <p>
        <Link href="/search" className="underline">Find a person</Link> to start exploring.
      </p>
    </article>
  );
}
