import type { MetadataRoute } from "next";
import { blogPosts } from "@/lib/blog-data";
import { getAllShopItemIds } from "@/lib/shop-detail";

const baseUrl = "https://www.sunflowenergysolutions.com.au";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/about",
    "/solar",
    "/battery",
    "/ev-charging",
    "/ev-charging/shop",
    "/ev-charging/compare",
    "/projects",
    "/contact",
    "/quote",
    "/blog",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  const blogRoutes = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const shopItemRoutes = getAllShopItemIds().map((id) => ({
    url: `${baseUrl}/ev-charging/shop/${id}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...staticRoutes, ...blogRoutes, ...shopItemRoutes];
}
