"use client";

import { SlidersHorizontal, X, Home, Building2, Eye, Target, Hammer } from "lucide-react";
import type { MapFilters, TypeFilter } from "./types";

export default function FiltersBubble({
  open,
  setOpen,
  filters,
  setFilters,
  minYear,
  maxYear,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  filters: MapFilters;
  setFilters: (f: MapFilters) => void;
  minYear: number;
  maxYear: number;
}) {
  return (
    <>
      {/* Button — visible when closed */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="absolute top-4 left-4 z-10 inline-flex items-center gap-2.5 px-5 py-3 rounded-full bg-white text-ink font-medium text-[15px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-[color:var(--line)] hover:bg-[color:var(--brand)] hover:text-white hover:border-transparent transition min-h-[44px]"
          aria-label="Ouvrir les filtres"
        >
          <SlidersHorizontal size={18} />
          Filtres
          <span className="hidden sm:inline text-xs text-ink-mute group-hover:text-white/80">
            {summarize(filters)}
          </span>
        </button>
      )}

      {/* Panel — visible when open */}
      {open && (
        <div className="absolute top-4 left-4 z-10 w-[340px] max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.18)] border border-[color:var(--line)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--line-soft)]">
            <div className="flex items-center gap-2 text-ink font-medium text-[15px]">
              <SlidersHorizontal size={17} className="text-brand-strong" />
              Filtres de la carte
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-2 text-ink-soft hover:text-ink hover:bg-surface-warm min-w-[36px] min-h-[36px] flex items-center justify-center"
              aria-label="Fermer"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-5 py-5 space-y-6">
            {/* Période */}
            <Section title="Période analysée">
              <div className="flex items-center gap-3 text-[15px]">
                <select
                  value={filters.yearRange[0]}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      yearRange: [
                        Number(e.target.value),
                        Math.max(Number(e.target.value), filters.yearRange[1]),
                      ],
                    })
                  }
                  className="flex-1 bg-white border border-[color:var(--line)] rounded-lg px-3 py-2.5 text-ink focus:outline-none focus:border-brand min-h-[44px]"
                >
                  {range(minYear, maxYear).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <span className="text-ink-mute">à</span>
                <select
                  value={filters.yearRange[1]}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      yearRange: [
                        Math.min(Number(e.target.value), filters.yearRange[0]),
                        Number(e.target.value),
                      ],
                    })
                  }
                  className="flex-1 bg-white border border-[color:var(--line)] rounded-lg px-3 py-2.5 text-ink focus:outline-none focus:border-brand min-h-[44px]"
                >
                  {range(minYear, maxYear).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </Section>

            {/* Type de bien */}
            <Section title="Type de bien">
              <div className="grid grid-cols-3 gap-2">
                <PillButton
                  active={filters.typeFilter === "all"}
                  onClick={() => setFilters({ ...filters, typeFilter: "all" })}
                  icon={<Eye size={16} />}
                  label="Tous"
                />
                <PillButton
                  active={filters.typeFilter === "Appartement"}
                  onClick={() => setFilters({ ...filters, typeFilter: "Appartement" as TypeFilter })}
                  icon={<Building2 size={16} />}
                  label="Apparts."
                />
                <PillButton
                  active={filters.typeFilter === "Maison"}
                  onClick={() => setFilters({ ...filters, typeFilter: "Maison" as TypeFilter })}
                  icon={<Home size={16} />}
                  label="Maisons"
                />
              </div>
            </Section>

            {/* Volume minimum */}
            <Section title={`N'afficher que les rues avec au moins ${filters.minSales} ventes`}>
              <input
                type="range"
                min={1}
                max={50}
                value={filters.minSales}
                onChange={(e) =>
                  setFilters({ ...filters, minSales: Number(e.target.value) })
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-ink-mute mt-1">
                <span>1</span>
                <span>25</span>
                <span>50</span>
              </div>
            </Section>

            {/* Pipeline ventes probables (DPE F/G + signaux) */}
            <Section title="Pipeline de ventes probables">
              <button
                type="button"
                onClick={() =>
                  setFilters({ ...filters, showPipeline: !filters.showPipeline })
                }
                className={`w-full inline-flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-[13px] min-h-[44px] transition ${
                  filters.showPipeline
                    ? "bg-brand border-brand text-white"
                    : "bg-white border-[color:var(--line)] text-ink-soft hover:border-brand hover:text-ink"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Target size={15} />
                  Logements à fort potentiel
                </span>
                <span className={`text-[11px] ${filters.showPipeline ? "text-white/85" : "text-ink-mute"}`}>
                  6 311 candidats
                </span>
              </button>
              <p className="text-[11px] text-ink-mute mt-2 leading-relaxed">
                Logements DPE F/G + bâti ancien sur les quartiers actifs. Cliquez
                un point pour ouvrir l&apos;adresse sur Pages Blanches.
              </p>
            </Section>

            {/* Bâti récent (proxy permis de construire) */}
            <Section title="Activité bâti récente (proxy permis)">
              <button
                type="button"
                onClick={() =>
                  setFilters({ ...filters, showPermits: !filters.showPermits })
                }
                className={`w-full inline-flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-[13px] min-h-[44px] transition ${
                  filters.showPermits
                    ? "bg-brand border-brand text-white"
                    : "bg-white border-[color:var(--line)] text-ink-soft hover:border-brand hover:text-ink"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Hammer size={15} />
                  Bâtiments modifiés (2019-2026)
                </span>
                <span className={`text-[11px] ${filters.showPermits ? "text-white/85" : "text-ink-mute"}`}>
                  1 005 points
                </span>
              </button>
              <p className="text-[11px] text-ink-mute mt-2 leading-relaxed">
                Mises à jour cadastrales IGN — proxy fiable des permis,
                extensions, démolitions et divisions parcellaires récentes.
              </p>
            </Section>
          </div>

          <div className="px-5 py-3 border-t border-[color:var(--line-soft)] bg-surface-warm">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-brand text-white font-medium text-[15px] hover:bg-brand-strong transition min-h-[44px]"
            >
              Voir la carte
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[12px] uppercase tracking-[0.12em] text-ink-mute mb-2.5">
        {title}
      </div>
      {children}
    </div>
  );
}

function PillButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-2.5 rounded-lg text-[13px] font-medium border transition min-h-[44px] ${
        active
          ? "bg-brand border-brand text-white"
          : "bg-white border-[color:var(--line)] text-ink-soft hover:border-brand hover:text-ink"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function range(a: number, b: number): number[] {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}

function summarize(f: MapFilters): string {
  const parts: string[] = [];
  parts.push(`${f.yearRange[0]}–${f.yearRange[1]}`);
  if (f.typeFilter !== "all") parts.push(f.typeFilter.toLowerCase() + "s");
  return parts.join(" · ");
}
