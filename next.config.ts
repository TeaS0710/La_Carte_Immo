import type { NextConfig } from "next";
import path from "node:path";

/**
 * Static export config — compatible GitHub Pages.
 *
 * Pour déployer sur GitHub Pages d'un repo "mon-repo" hébergé à
 * `https://<user>.github.io/mon-repo/`, lance le build ainsi :
 *
 *   NEXT_PUBLIC_BASE_PATH=/mon-repo npm run build
 *
 * Le dossier `out/` produit est prêt à être déposé sur la branche `gh-pages`.
 *
 * Pour un domaine custom à la racine, ne définis pas NEXT_PUBLIC_BASE_PATH.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
  turbopack: { root: path.join(__dirname) },
};

export default nextConfig;
