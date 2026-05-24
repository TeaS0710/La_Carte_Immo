"use client";

import { ShieldAlert, ExternalLink, Info } from "lucide-react";
import type { CommuneRisks, RiskIntensity, RiskItem } from "./types";

/**
 * Affiche les risques Géorisques de la commune avec :
 *  - hiérarchie d'intensité (badge couleur faible/moyen/fort)
 *  - clarification "à l'échelle commune" pour éviter la confusion par quartier
 *  - note pratique par risque pour le courtier (impact mandat / compromis)
 *  - compte ICPE, classe radon, PPR approuvés
 */
export default function RisquesPanel({ risks }: { risks: CommuneRisks }) {
  if (!risks || risks.n_risks_present === 0) return null;

  const byCategory: Record<string, [string, RiskItem][]> = {
    risquesNaturels: [],
    risquesTechnologiques: [],
    risquesPollution: [],
  };
  for (const [k, r] of Object.entries(risks.risks)) {
    byCategory[r.category]?.push([k, r]);
  }

  return (
    <div className="space-y-4">
      {/* Bandeau d'avertissement contextuel */}
      <div className="rounded-lg border border-[color:var(--line)] bg-surface-warm px-4 py-3 text-[12px] text-ink-soft leading-relaxed flex gap-2 items-start">
        <Info size={14} className="text-brand-strong shrink-0 mt-0.5" />
        <span>
          <strong className="text-ink">À l&apos;échelle de la commune entière</strong>{" "}
          (Saint-Maur-des-Fossés, INSEE&nbsp;{risks.code_insee}). Pour le détail
          d&apos;une adresse précise,{" "}
          <a
            href={risks.georisques_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-strong underline underline-offset-2 hover:text-ink"
          >
            consultez le rapport officiel Géorisques
            <ExternalLink size={10} className="inline ml-1" />
          </a>
          .
        </span>
      </div>

      {/* Indicateurs de synthèse */}
      <div className="grid grid-cols-3 gap-2.5">
        <SynthBox
          label="Risques recensés"
          value={String(risks.n_risks_present)}
          sub="naturels & techno"
        />
        <SynthBox
          label="Installations classées"
          value={risks.icpe_count != null ? String(risks.icpe_count) : "—"}
          sub="ICPE commune"
        />
        <SynthBox
          label="Plans de prévention"
          value={String(risks.ppr_risques?.length ?? 0)}
          sub="PPR approuvés"
        />
      </div>

      {/* Liste par catégorie */}
      {byCategory.risquesNaturels.length > 0 && (
        <CategoryBlock
          title="Risques naturels"
          items={byCategory.risquesNaturels}
        />
      )}
      {byCategory.risquesTechnologiques.length > 0 && (
        <CategoryBlock
          title="Risques technologiques"
          items={byCategory.risquesTechnologiques}
        />
      )}
      {byCategory.risquesPollution.length > 0 && (
        <CategoryBlock
          title="Risques de pollution"
          items={byCategory.risquesPollution}
        />
      )}

      {/* PPR approuvés (liste discrète) */}
      {risks.ppr_risques && risks.ppr_risques.length > 0 && (
        <div className="text-[12px] text-ink-soft pt-2 border-t border-[color:var(--line-soft)]">
          <span className="text-ink-soft">Plans de prévention approuvés :</span>{" "}
          <strong className="text-ink">{risks.ppr_risques.join(" · ")}</strong>
        </div>
      )}
    </div>
  );
}

function CategoryBlock({
  title,
  items,
}: {
  title: string;
  items: [string, RiskItem][];
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.12em] text-ink-soft mb-2 inline-flex items-center gap-1.5">
        <ShieldAlert size={11} className="text-brand-strong" />
        {title}
      </div>
      <ul className="space-y-2">
        {items.map(([k, r]) => (
          <li
            key={k}
            className="rounded-lg border border-[color:var(--line)] bg-white p-3"
          >
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <div className="text-[13.5px] font-medium text-ink leading-snug">
                {r.label}
              </div>
              <IntensityBadge intensity={r.intensity} />
            </div>
            {r.note && (
              <p className="text-[12px] text-ink-soft leading-relaxed">
                {r.note}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SynthBox({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-lg border border-[color:var(--line)] bg-white px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-0.5 leading-tight">
        {label}
      </div>
      <div className="text-[18px] font-semibold text-ink tabular leading-tight">
        {value}
      </div>
      <div className="text-[10.5px] text-ink-soft mt-0.5">{sub}</div>
    </div>
  );
}

function IntensityBadge({ intensity }: { intensity: RiskIntensity }) {
  const map: Record<RiskIntensity, { label: string; bg: string; fg: string }> = {
    fort: {
      label: "Aléa fort",
      bg: "#f4ddd5",
      fg: "#7a2810",
    },
    moyen: {
      label: "Aléa moyen",
      bg: "#f4e8cf",
      fg: "#9d7e44",
    },
    faible: {
      label: "Aléa faible",
      bg: "#e6ece2",
      fg: "#5a6a52",
    },
    present: {
      label: "Présent sur commune",
      bg: "#eef0f3",
      fg: "#5a554f",
    },
    unknown: {
      label: "Statut inconnu",
      bg: "#eef0f3",
      fg: "#9b9690",
    },
  };
  const cfg = map[intensity] ?? map.unknown;
  return (
    <span
      className="shrink-0 text-[10.5px] font-semibold uppercase tracking-[0.06em] px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.fg }}
    >
      {cfg.label}
    </span>
  );
}
