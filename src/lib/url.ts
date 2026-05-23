/**
 * Prefix any asset/data URL with the configured base path.
 * Required for static export deployed under a sub-directory
 * (e.g. GitHub Pages at username.github.io/repo-name/).
 *
 * Usage : `fetch(assetUrl("/data/saint-maur/streets.geojson"))`
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function assetUrl(path: string): string {
  if (!path.startsWith("/")) return BASE + "/" + path;
  return BASE + path;
}
