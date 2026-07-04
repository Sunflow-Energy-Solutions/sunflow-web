import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/ev-charging/checkout"],
    },
    sitemap: "https://www.sunflowenergysolutions.com.au/sitemap.xml",
  };
}
