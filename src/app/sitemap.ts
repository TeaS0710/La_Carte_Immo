import fs from "node:fs/promises";
import path from "node:path";
import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://teas0710.github.io";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// Requis pour `output: export`
export const dynamic = "force-static";

interface CommuneRef {
  slug: string;
  code_insee: string;
}

async function listAvailableSlugs(): Promise<string[]> {
  try {
    const manifest = JSON.parse(
      await fs.readFile(
        path.join(process.cwd(), "public", "data", "idf", "communes.json"),
        "utf-8",
      ),
    ) as CommuneRef[];
    const dir = path.join(process.cwd(), "public", "data", "commune");
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const haveData = new Set(entries.filter((e) => e.isDirectory()).map((e) => e.name));
    return manifest.filter((c) => haveData.has(c.code_insee)).map((c) => c.slug);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const u = (p: string) => `${SITE_URL}${BASE_PATH}${p}`;

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: u("/"), lastModified: now, changeFrequency: "monthly", priority: 1.0 },
    { url: u("/carte/"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: u("/comparateur/"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: u("/methodo/"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: u("/carte/region/idf/"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: u("/carte/dept/75/"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: u("/carte/dept/77/"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: u("/carte/dept/94/"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: u("/carte/ville/paris/"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
  ];

  const slugs = await listAvailableSlugs();
  const villeRoutes: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: u(`/carte/ville/${slug}/`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...villeRoutes];
}
