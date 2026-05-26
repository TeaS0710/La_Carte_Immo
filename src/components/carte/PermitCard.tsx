"use client";

import { X, Hammer } from "lucide-react";
import type { PermitFeature } from "./types";
import ExternalLookup from "./ExternalLookup";
import { useEscape } from "@/lib/useEscape";

type PermitWithCoords = PermitFeature & { lng: number; lat: number };

export default function PermitCard({
  permit,
  communeName,
  onClose,
}: {
  permit: PermitWithCoords;
  communeName?: string;
  onClose: () => void;
}) {
  useEscape(true, onClose);
  // Adresse approximative à partir des coords (utilisée comme query lookup)
  const approxQuery = permit.nom_iris
    ? `${permit.nom_iris}`
    : `${permit.lat.toFixed(5)} ${permit.lng.toFixed(5)}`;
  const updatedDate = new Date(permit.updated).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Fiche bâtiment modifié"
      className={[
        "absolute z-10 bg-white overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.18)]",
        "inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-[color:var(--line)]",
        "sm:inset-x-auto sm:bottom-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-[min(420px,calc(100vw-32px))] sm:max-h-none sm:overflow-hidden sm:rounded-2xl sm:border sm:border-[color:var(--line)]",
      ].join(" ")}
    >
      <div className="sm:hidden flex justify-center pt-2 pb-1 sticky top-0 bg-white z-20 -mb-1">
        <div className="w-10 h-1 rounded-full bg-[color:var(--line)]" aria-hidden="true" />
      </div>
      <header className="bg-white border-b border-[color:var(--line-soft)] px-5 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.15em] text-brand-strong mb-1 inline-flex items-center gap-1.5">
              <Hammer size={11} />
              Activité bâti récente
            </div>
            <h3 className="text-[15px] font-semibold text-ink leading-tight">
              Quartier {permit.nom_iris ?? "—"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-ink-soft hover:text-ink hover:bg-surface-warm shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Lookups — pour les permits on a les coords GPS donc Street View direct */}
        <div className="flex flex-wrap gap-1.5">
          <ExternalLookup source="maps" query={approxQuery} coords={{ lat: permit.lat, lng: permit.lng }} communeName={communeName} />
          <ExternalLookup source="streetview" query={approxQuery} coords={{ lat: permit.lat, lng: permit.lng }} communeName={communeName} />
          <ExternalLookup source="pagesblanches" query={approxQuery} communeName={communeName} />
          <ExternalLookup source="pagesjaunes" query={approxQuery} communeName={communeName} />
          <ExternalLookup source="pappers" query={approxQuery} communeName={communeName} />
        </div>
      </header>

      <div className="p-5 space-y-3 text-[14px]">
        <Row label="Mise à jour cadastrale" value={updatedDate} accent />
        <Row label="Type" value={permit.type_bati} />
        {permit.area_m2 && permit.area_m2 > 0 && (
          <Row label="Emprise au sol approx." value={`${Math.round(permit.area_m2)} m²`} />
        )}
        <Row
          label="Coordonnées GPS"
          value={`${permit.lat.toFixed(5)}, ${permit.lng.toFixed(5)}`}
        />
      </div>

      <div className="px-5 pb-5">
        <p className="text-[11px] text-ink-mute leading-relaxed">
          Source : IGN cadastre. La mise à jour cadastrale indique généralement
          un permis de construire, une extension, une démolition ou une
          division parcellaire. Adresse précise non disponible — utilisez
          Google Maps pour localiser le bien.
        </p>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] uppercase tracking-[0.12em] text-ink-mute">{label}</span>
      <span className={`tabular ${accent ? "text-brand-strong font-semibold" : "text-ink"}`}>
        {value}
      </span>
    </div>
  );
}
