/**
 * Référentiel minimal des communes traitées.
 *
 * À terme on listera ici les ~1290 communes IDF couvertes. Pour l'instant
 * Saint-Maur est la commune par défaut et le routeur Next.js sert /carte
 * directement avec cette commune.
 */

export interface CommuneRef {
  code_insee: string;
  nom: string;
  slug: string;
  code_dept: string;
  code_postal: string;
  population?: number;
  lng?: number;
  lat?: number;
}

export const DEFAULT_COMMUNE: CommuneRef = {
  code_insee: "94068",
  nom: "Saint-Maur-des-Fossés",
  slug: "saint-maur-des-fosses",
  code_dept: "94",
  code_postal: "94100",
  population: 75501,
  lng: 2.4901,
  lat: 48.8014,
};

export const COMMUNES: CommuneRef[] = [
  DEFAULT_COMMUNE,
  // À enrichir progressivement (Phase 3)
];

export function findCommuneBySlug(slug: string): CommuneRef | undefined {
  return COMMUNES.find((c) => c.slug === slug);
}

export function findCommuneByInsee(code: string): CommuneRef | undefined {
  return COMMUNES.find((c) => c.code_insee === code);
}
