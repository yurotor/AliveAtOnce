import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/present";
import { PEOPLE_MAPS } from "./sitemap";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: Array.from({ length: PEOPLE_MAPS + 1 }, (_, i) => `${SITE_URL}/sitemap/${i}.xml`),
  };
}
