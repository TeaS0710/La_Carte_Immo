/**
 * Prefix any asset/data URL with the configured base path.
 * Required for static export deployed under a sub-directory
 * (e.g. GitHub Pages at username.github.io/repo-name/).
 *
 * Usage : `fetch(assetUrl("/prelys/logo.png"))`
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function assetUrl(path: string): string {
  if (!path.startsWith("/")) return BASE + "/" + path;
  return BASE + path;
}

/**
 * Resolveur centralisé des data publiées par commune.
 * Évite les chemins en dur du genre /data/commune/94068/streets.geojson
 * partout dans le code — on passe un code INSEE et un nom de fichier.
 *
 * Usage : `fetch(communeDataUrl("94068", "streets.geojson"))`
 */
export function communeDataUrl(codeInsee: string, file: string): string {
  return assetUrl(`/data/commune/${codeInsee}/${file}`);
}

/**
 * Niveau département agrégé : /data/dept/{code}.json
 */
export function deptDataUrl(codeDept: string): string {
  return assetUrl(`/data/dept/${codeDept}.json`);
}

/**
 * Niveau région agrégé : /data/idf/region.json (futur : /data/region/{slug}.json)
 */
export function regionDataUrl(slug = "idf"): string {
  return slug === "idf"
    ? assetUrl(`/data/idf/region.json`)
    : assetUrl(`/data/region/${slug}.json`);
}
