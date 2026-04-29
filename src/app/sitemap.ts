import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const now = new Date();

  const staticRoutes: string[] = [
    "/",
    "/about",
    "/pricing",
    "/practice",
    "/mock-tests",
    "/vocabulary",
    "/get-free",
    "/login",
    "/signup",
    "/forgot-password",
    "/privacy",
    "/terms",
    "/cookies",
  ];

  return staticRoutes.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: path === "/" ? 1 : 0.7,
  }));
}

