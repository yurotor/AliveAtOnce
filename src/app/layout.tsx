import type { Metadata, Viewport } from "next";
import { Gloock, Hanken_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SITE_URL } from "@/lib/present";
import "./globals.css";
import "./card.css";

const gloock = Gloock({ variable: "--font-gloock", weight: "400", subsets: ["latin"] });
const hanken = Hanken_Grotesk({ variable: "--font-hanken", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Alive At Once — whose lifetimes overlapped",
    template: "%s · Alive At Once",
  },
  description:
    "Surprising lifetime overlaps between famous people. Pablo Picasso caught Charles Darwin and Eminem.",
  openGraph: { siteName: "Alive At Once", type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#15172b", viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${gloock.variable} ${hanken.variable}`}>
      <body className="min-h-dvh bg-paper text-ink">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
