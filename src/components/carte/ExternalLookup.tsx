"use client";

import { ExternalLink, MapPin, Phone, Building2, Briefcase, Footprints } from "lucide-react";

type Source = "maps" | "streetview" | "pagesjaunes" | "pagesblanches" | "pappers" | "cadastre";

const LABELS: Record<Source, string> = {
  maps: "Google Maps",
  streetview: "Street View",
  pagesjaunes: "Rechercher Pages Jaunes",
  pagesblanches: "Rechercher Pages Blanches",
  pappers: "Pappers (SCI)",
  cadastre: "Cadastre",
};

const ICONS: Record<Source, React.ReactNode> = {
  maps: <MapPin size={11} />,
  streetview: <Footprints size={11} />,
  pagesjaunes: <Briefcase size={11} />,
  pagesblanches: <Phone size={11} />,
  pappers: <Building2 size={11} />,
  cadastre: <Building2 size={11} />,
};

/**
 * Deeplinks vers les vrais formulaires de recherche des sites publics.
 * Aucun scraping côté code : on construit l'URL avec les paramètres documentés
 * du formulaire HTML, le navigateur de l'utilisateur fait la requête lui-même.
 *
 * URL pattern officiel Pages Jaunes (vérifié sur leur form HTML) :
 *   /annuaire/recherche?quoiqui=&ou={ou}       → pros à cette adresse
 *   /pagesblanches/recherche?quoiqui=&ou={ou}  → particuliers dans cette zone
 *
 * Note : Pages Blanches accepte un "ou" libre. Sans nom (quoiqui vide), ça
 * affiche les particuliers listés sur l'ensemble de la commune ; pour un
 * lookup précis le courtier peut affiner ensuite dans leur formulaire.
 */
function buildUrl(source: Source, query: string, coords?: { lat: number; lng: number }): string {
  const full = `${query}, Saint-Maur-des-Fossés`;
  switch (source) {
    case "maps":
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(full)}`;
    case "streetview":
      // Si on a les coords GPS on ouvre Street View directement à cette position,
      // sinon on tombe sur la recherche Google Maps en mode "panorama".
      if (coords) {
        return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${coords.lat},${coords.lng}`;
      }
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(full)}&layer=c`;
    case "pagesjaunes":
      // Recherche pro / entreprises à cette adresse exacte
      return `https://www.pagesjaunes.fr/annuaire/recherche?quoiqui=&ou=${encodeURIComponent(
        full,
      )}&proximite=0`;
    case "pagesblanches":
      // Recherche particuliers dans cette zone (form PB pré-rempli)
      return `https://www.pagesjaunes.fr/pagesblanches/recherche?quoiqui=&ou=${encodeURIComponent(
        full,
      )}`;
    case "pappers":
      // Pappers SCI/entreprises — pré-rempli avec l'adresse
      return `https://www.pappers.fr/recherche?q=${encodeURIComponent(full)}`;
    case "cadastre":
      return `https://www.cadastre.gouv.fr/scpc/rechercherPlan.do#${encodeURIComponent(
        full,
      )}`;
  }
}

export default function ExternalLookup({
  source,
  query,
  coords,
  variant = "pill",
}: {
  source: Source;
  query: string;
  coords?: { lat: number; lng: number };
  variant?: "pill" | "inline";
}) {
  const url = buildUrl(source, query, coords);
  if (variant === "inline") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[11px] text-ink-mute hover:text-brand-strong transition"
        title={`Ouvrir ${LABELS[source]} pour : ${query}`}
      >
        {ICONS[source]}
        {LABELS[source]}
        <ExternalLink size={9} />
      </a>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[color:var(--line)] text-[11px] text-ink-soft hover:bg-surface-warm hover:text-ink transition"
      title={`Ouvrir ${LABELS[source]} pour : ${query}`}
    >
      {ICONS[source]}
      {LABELS[source]}
      <ExternalLink size={9} />
    </a>
  );
}
