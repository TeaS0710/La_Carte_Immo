"use client";

import { X, Home, Building2, Ruler, Calendar } from "lucide-react";
import type { PipelineLogement, PipelineSignal } from "./types";
import ExternalLookup from "./ExternalLookup";
import { useEscape } from "@/lib/useEscape";

function dpeColor(et: string): string {
  return et === "G" ? "#7a2810" : et === "F" ? "#b54f3a" : "#c09b5a";
}

export default function PipelineCard({
  logement,
  communeName,
  onClose,
}: {
  logement: PipelineLogement;
  communeName?: string;
  onClose: () => void;
}) {
  useEscape(true, onClose);

  let signals: PipelineSignal[] = [];
  try {
    signals = JSON.parse(logement.signals_json || "[]");
  } catch {
    /* ignore */
  }
  const positiveSignals = signals.filter((s) => (s.logit_delta ?? s.weight ?? 0) > 0);

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="pipeline-card-title"
      className={[
        "absolute z-10 bg-white overflow-y-auto shadow-[0_8px_32px_rgba(0,0,0,0.18)]",
        "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl border-t border-[color:var(--line)]",
        "sm:inset-x-auto sm:bottom-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-[min(480px,calc(100vw-32px))] sm:max-h-[85vh] sm:rounded-2xl sm:border sm:border-[color:var(--line)]",
      ].join(" ")}
    >
      {/* Drag handle mobile */}
      <div className="sm:hidden flex justify-center pt-2 pb-1 sticky top-0 bg-white z-20 -mb-1">
        <div className="w-10 h-1 rounded-full bg-[color:var(--line)]" aria-hidden="true" />
      </div>
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-[color:var(--line-soft)] px-5 pt-4 pb-3 z-10">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.15em] text-brand-strong mb-1">
              Logement à fort potentiel
            </div>
            <h3 id="pipeline-card-title" className="text-[16px] font-semibold text-ink leading-tight">
              {logement.addr}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-ink-soft hover:text-ink hover:bg-surface-warm shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Lookups : Maps / Street View / Pages Jaunes / Pages Blanches / Pappers */}
        <div className="flex flex-wrap gap-1.5">
          <ExternalLookup source="maps" query={logement.addr} communeName={communeName} />
          <ExternalLookup source="streetview" query={logement.addr} communeName={communeName} />
          <ExternalLookup source="pagesblanches" query={logement.addr} communeName={communeName} />
          <ExternalLookup source="pagesjaunes" query={logement.addr} communeName={communeName} />
          <ExternalLookup source="pappers" query={logement.addr} communeName={communeName} />
        </div>
        <p className="text-[10px] text-ink-mute mt-1.5 leading-snug">
          Les liens ouvrent la recherche pré-remplie sur le site officiel. Une fiche n&apos;est pas garantie : seule la présence d&apos;une page jaune sur cette adresse permet la prospection.
        </p>
      </header>

      <div className="p-5 space-y-5">
        {/* Probabilité */}
        <div className="rounded-lg border border-[color:var(--line)] bg-surface-warm p-4">
          <div className="text-[11px] uppercase tracking-[0.15em] text-ink-soft mb-2">
            Probabilité de mise en vente sous 12 mois
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <div
              className="tabular text-[32px] font-bold leading-none"
              style={{ color: dpeColor(logement.etiquette_dpe) }}
            >
              {logement.proba_sale_12m.toFixed(1)}
              <span className="text-sm text-ink-mute font-normal"> %</span>
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-[color:var(--line-soft)] overflow-hidden">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${Math.min(100, logement.proba_sale_12m)}%`,
                background: dpeColor(logement.etiquette_dpe),
              }}
            />
          </div>
        </div>

        {/* Caractéristiques */}
        <section>
          <div className="text-[11px] uppercase tracking-[0.15em] text-ink-mute mb-2.5">
            Caractéristiques
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field
              icon={
                logement.type_bati === "appartement" ? (
                  <Building2 size={14} className="text-brand-strong" />
                ) : (
                  <Home size={14} className="text-brand-strong" />
                )
              }
              label="Type"
              value={
                logement.type_bati
                  ? logement.type_bati[0].toUpperCase() + logement.type_bati.slice(1)
                  : "-"
              }
            />
            <Field
              icon={<DpeBadge etiquette={logement.etiquette_dpe} />}
              label="Diagnostic énergie"
              value={`Étiquette ${logement.etiquette_dpe}`}
            />
            <Field
              icon={<Ruler size={14} className="text-brand-strong" />}
              label="Surface"
              value={logement.surface ? `${logement.surface} m²` : "-"}
            />
            <Field
              icon={<Calendar size={14} className="text-brand-strong" />}
              label="Année de construction"
              value={logement.annee_construction ? String(logement.annee_construction) : "-"}
            />
          </div>
          {logement.chauffage && (
            <div className="text-[12px] text-ink-soft mt-3">
              Chauffage principal : <strong className="text-ink">{logement.chauffage}</strong>
            </div>
          )}
        </section>

        {/* Facteurs explicatifs du score */}
        {positiveSignals.length > 0 && (
          <section>
            <div className="text-[11px] uppercase tracking-[0.15em] text-ink-mute mb-2.5">
              Pourquoi cette probabilité
            </div>
            <ul className="space-y-1.5 text-[13px]">
              {positiveSignals.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-ink-soft leading-relaxed">
                  <span className="text-brand-strong mt-1.5 inline-block h-1 w-1 rounded-full bg-brand-strong shrink-0" />
                  {s.label}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Quartier */}
        {logement.nom_iris && (
          <div className="text-[12px] text-ink-soft pt-3 border-t border-[color:var(--line-soft)]">
            Quartier <strong className="text-ink">{logement.nom_iris}</strong> (IRIS {logement.code_iris})
          </div>
        )}

        <p className="text-[11px] text-ink-mute leading-relaxed">
          Données DPE ADEME, score calibré sur l&apos;historique des
          transactions DVF locales. Probabilité indicative à recouper en
          terrain ou par boîtage avant prospection.
        </p>
      </div>
    </div>
  );
}

function Field({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="h-6 w-6 shrink-0 rounded bg-[color:var(--brand-soft)]/30 flex items-center justify-center mt-0.5">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-[0.12em] text-ink-mute">{label}</div>
        <div className="text-[13px] text-ink font-medium tabular truncate">{value}</div>
      </div>
    </div>
  );
}

function DpeBadge({ etiquette }: { etiquette: "E" | "F" | "G" }) {
  const bg = dpeColor(etiquette);
  return (
    <div
      className="h-6 w-6 shrink-0 rounded text-white font-bold text-[12px] flex items-center justify-center tabular"
      style={{ background: bg }}
    >
      {etiquette}
    </div>
  );
}
