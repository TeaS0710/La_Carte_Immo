"use client";

import Link from "next/link";
import { Database, ShieldCheck, ExternalLink } from "lucide-react";

interface Source {
  short: string;
  full: string;
  description: string;
  url: string;
}

const SOURCES: Source[] = [
  { short: "DGFiP DVF", full: "Demandes de Valeurs Foncières", description: "Toutes les transactions immobilières publiques 2021-2025", url: "https://www.data.gouv.fr/fr/datasets/demandes-de-valeurs-foncieres-geolocalisees/" },
  { short: "INSEE RP", full: "Recensement de la population 2021", description: "Démographie, CSP, diplômes, logement par IRIS", url: "https://www.insee.fr/fr/statistiques/7704076" },
  { short: "INSEE IRIS", full: "Découpage IRIS 2024", description: "Polygones officiels des quartiers infra-communaux", url: "https://www.insee.fr/fr/information/2017499" },
  { short: "ADEME DPE", full: "Diagnostics de Performance Énergétique", description: "Étiquettes énergie de chaque logement", url: "https://data.ademe.fr/datasets/dpe03existant" },
  { short: "IGN BD TOPO", full: "Base topographique IGN", description: "Cadastre bâti, parcelles, voies, équipements", url: "https://geoservices.ign.fr/bdtopo" },
  { short: "BAN", full: "Base Adresse Nationale", description: "Référentiel officiel des adresses françaises", url: "https://adresse.data.gouv.fr/" },
  { short: "INSEE BPE", full: "Base Permanente des Équipements 2024", description: "Commerces, écoles, santé, services par commune", url: "https://www.insee.fr/fr/statistiques/3568656" },
  { short: "Géorisques", full: "Géorisques (MTECT)", description: "PPR, ICPE, Radon, RGA, AZI, BASOL, BASIAS", url: "https://www.georisques.gouv.fr/" },
  { short: "GASPAR", full: "Plans de Prévention des Risques", description: "PPR approuvés par commune (inondation, mouvement, TMD)", url: "https://www.georisques.gouv.fr/donnees/bases-de-donnees/gaspar" },
  { short: "Etalab cadastre", full: "Cadastre Etalab", description: "Parcelles et bâtiments en données ouvertes", url: "https://cadastre.data.gouv.fr/" },
];

/**
 * Bandeau valorisant les sources d'État croisées pour générer les
 * analyses. Affiché en footer des pages cartes pour démontrer la
 * rigueur et la richesse de la KB.
 */
export default function DataSourcesBanner({
  irisCount,
  communesCount,
  ventesCount,
}: {
  irisCount?: number;
  communesCount?: number;
  ventesCount?: number;
}) {
  const fmt = (n: number) => n.toLocaleString("fr-FR");
  return (
    <section
      className="rounded-2xl border border-[color:var(--line)] bg-surface-warm/40 px-5 py-5 mt-6"
      aria-label="Sources d'État officielles croisées"
    >
      <div className="flex items-start gap-3 mb-4">
        <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-brand-soft/40 shrink-0">
          <Database size={16} className="text-brand-strong" aria-hidden="true" />
        </span>
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-brand-strong mb-0.5">
            Méthodologie
          </div>
          <div className="text-[15px] font-semibold text-ink leading-tight">
            {SOURCES.length} bases de données officielles croisées
          </div>
          <div className="text-[12px] text-ink-soft mt-0.5">
            Chaque indicateur affiché provient directement d&apos;une source d&apos;État.
            Les analyses recoupent les chiffres entre eux pour garantir la cohérence.
          </div>
        </div>
      </div>

      {(communesCount || ventesCount || irisCount) && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {communesCount != null && (
            <Stat label="Communes analysées" value={fmt(communesCount)} />
          )}
          {ventesCount != null && (
            <Stat label="Transactions DVF" value={fmt(ventesCount)} />
          )}
          {irisCount != null && (
            <Stat label="Quartiers IRIS" value={fmt(irisCount)} />
          )}
        </div>
      )}

      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5">
        {SOURCES.map((s) => (
          <li key={s.short}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-2.5 py-1.5 rounded border border-[color:var(--line-soft)] bg-white text-[11px] text-ink hover:border-brand transition group"
              title={`${s.full} — ${s.description}`}
            >
              <span className="block font-semibold text-ink text-[11.5px] truncate">
                {s.short}
              </span>
              <span className="block text-ink-soft text-[10px] truncate group-hover:text-brand-strong">
                {s.full}
              </span>
            </a>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-[color:var(--line-soft)]">
        <div className="inline-flex items-center gap-1.5 text-[11px] text-ink-soft">
          <ShieldCheck size={11} className="text-brand-strong" aria-hidden="true" />
          Toutes les sources sont publiques et sous Licence Ouverte 2.0
        </div>
        <Link
          href={"/methodo"}
          className="inline-flex items-center gap-1 text-[11.5px] text-brand-strong font-medium hover:text-ink"
        >
          Méthodologie détaillée
          <ExternalLink size={10} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[color:var(--line)] bg-white px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.12em] text-ink-soft leading-tight">
        {label}
      </div>
      <div className="text-[16px] font-semibold text-ink tabular leading-tight mt-0.5">
        {value}
      </div>
    </div>
  );
}
