"use client";

import { ExternalLink } from "lucide-react";
import type { CommuneRisks, RiskIntensity } from "./types";

/**
 * Affichage compact des risques majeurs de la commune (Géorisques).
 * - 1 ligne contextuelle (commune-wide)
 * - liste à plat : pastille couleur d'intensité + libellé + statut court
 * - lien sortant vers le rapport officiel
 *
 * Reste sobre pour ne pas surcharger la fiche IRIS. Les notes pratiques
 * (loi ELAN sur RGA, ICPE, etc.) sont disponibles en tooltip natif (title=).
 */
export default function RisquesPanel({ risks }: { risks: CommuneRisks }) {
  if (!risks || risks.n_risks_present === 0) return null;

  const entries = Object.entries(risks.risks).sort((a, b) => {
    const order: Record<RiskIntensity, number> = {
      fort: 0, moyen: 1, faible: 2, present: 3, unknown: 4,
    };
    return order[a[1].intensity] - order[b[1].intensity];
  });

  return (
    <div className="space-y-3">
      <p className="text-[11.5px] text-ink-soft leading-snug">
        {risks.n_risks_present} risques recensés à l&apos;échelle de la commune
        ({risks.commune}, INSEE {risks.code_insee}).
      </p>

      <ul className="space-y-1.5">
        {entries.map(([k, r]) => (
          <li
            key={k}
            className="flex items-center gap-2.5 text-[12.5px]"
            title={r.note || r.raw_status || ""}
          >
            <IntensityDot intensity={r.intensity} />
            <span className="flex-1 text-ink leading-tight">{r.label}</span>
            <span className="text-[10.5px] text-ink-soft tabular shrink-0 uppercase tracking-wide">
              {intensityLabel(r.intensity)}
            </span>
          </li>
        ))}
      </ul>

      <a
        href={risks.georisques_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[11.5px] text-brand-strong hover:text-ink"
      >
        Rapport Géorisques par adresse
        <ExternalLink size={10} />
      </a>
    </div>
  );
}

function intensityLabel(i: RiskIntensity): string {
  return i === "fort" ? "Fort"
    : i === "moyen" ? "Moyen"
    : i === "faible" ? "Faible"
    : i === "present" ? "Présent"
    : "—";
}

function IntensityDot({ intensity }: { intensity: RiskIntensity }) {
  const color =
    intensity === "fort" ? "#7a2810"
    : intensity === "moyen" ? "#9d7e44"
    : intensity === "faible" ? "#a8b8a3"
    : intensity === "present" ? "#9b9690"
    : "#d9e0d4";
  return (
    <span
      aria-hidden="true"
      className="inline-block h-2 w-2 rounded-full shrink-0"
      style={{ background: color }}
    />
  );
}
