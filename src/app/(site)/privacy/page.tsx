import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy policy" };

export default function Privacy() {
  return (
    <article className="pt-10 sm:pt-16 max-w-prose space-y-4 leading-relaxed">
      <h1 className="font-display text-5xl mb-8">Privacy policy</h1>
      <p className="text-sm text-muted">Last updated 22 October 2026</p>
      <p>
        Alive At Once (aliveatonce.app) is a website about historical lifetimes. You can use it without an
        account, and we don’t ask for your name, email or any other personal details.
      </p>
      <h2 className="font-display text-2xl pt-4">What we collect</h2>
      <p>
        Our hosting provider (Vercel) keeps standard server logs, such as IP address, browser type and pages
        requested, to run and secure the site. We may use privacy-friendly, cookie-free analytics to count
        page views. Search terms you type are sent to our server to find matching people and are not stored
        with any identifier.
      </p>
      <h2 className="font-display text-2xl pt-4">Social media</h2>
      <p>
        We publish videos to our own Alive At Once accounts on TikTok, Instagram and YouTube. If we connect
        those accounts through their official APIs, we use the access only to upload and publish our own
        content, and we don’t collect data about other users.
      </p>
      <h2 className="font-display text-2xl pt-4">Third parties</h2>
      <p>
        Portraits load from Wikimedia Commons, which receives your IP address when your browser fetches an
        image. Share buttons open X or WhatsApp only when you click them.
      </p>
      <h2 className="font-display text-2xl pt-4">Contact</h2>
      <p>Questions about privacy: hello@aliveatonce.app</p>
    </article>
  );
}
