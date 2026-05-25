import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://teas0710.github.io";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// Requis pour `output: export` (static export). Sans cela, Next 16 refuse
// de générer le fichier au build.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}${BASE_PATH}/sitemap.xml`,
  };
}
