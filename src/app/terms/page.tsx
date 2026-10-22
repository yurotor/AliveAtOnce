import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of service" };

export default function Terms() {
  return (
    <article className="pt-10 sm:pt-16 max-w-prose space-y-4 leading-relaxed">
      <h1 className="font-display text-5xl mb-8">Terms of service</h1>
      <p className="text-sm text-muted">Last updated 22 October 2026</p>
      <p>
        By using aliveatonce.app you agree to these terms. The site is provided for entertainment and
        general information, as is, without warranties of any kind.
      </p>
      <h2 className="font-display text-2xl pt-4">Accuracy</h2>
      <p>
        Dates come from Wikidata and may contain errors. One-line summaries are written with the help of AI
        from those dates. Please don’t rely on the site for research where accuracy matters; check primary
        sources.
      </p>
      <h2 className="font-display text-2xl pt-4">Content and sharing</h2>
      <p>
        You’re welcome to share links, images and facts from the site. Underlying data from Wikidata is
        CC0; portraits belong to their respective Wikimedia Commons authors under their stated licences.
      </p>
      <h2 className="font-display text-2xl pt-4">Acceptable use</h2>
      <p>Don’t attempt to disrupt the service or scrape it at a rate that degrades it for others.</p>
      <h2 className="font-display text-2xl pt-4">Contact</h2>
      <p>hello@aliveatonce.app</p>
    </article>
  );
}
