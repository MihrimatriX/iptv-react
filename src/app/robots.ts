import type { MetadataRoute } from "next";

export const dynamic = "force-static"; // required by the static Pages export

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: "/",
      },
    ],
    sitemap: undefined,
    host: undefined,
  };
}
