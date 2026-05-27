"use client";

import { SlidersHorizontal, X, Home, Building2, Eye } from "lucide-react";
import type { MapFilters, TypeFilter } from "./types";

export default function FiltersBubble({
  open,
  setOpen,
  filters,
  setFilters,
  minYear,
  maxYear,
  hideTrigger = false,
  onHoverOpen,
  onHoverClose,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  filters: MapFilters;
  setFilters: (f: MapFilters) => void;
  minYear: number;
  maxYear: number;
  /** Sur mobile (< lg), masquer le bouton "Filtres" fermé pour éviter le
   *  chevauchement avec une bottom-sheet ouverte. Le panel ouvert reste
   *  affiché en bottom-sheet plein largeur (au-dessus de tout). */
  hideTrigger?: boolean;
  /** Handlers hover gérés au niveau parent (cancel timer / schedule close).
   *  Permet au panel de rester ouvert quand la souris passe du bouton au panel. */
  onHoverOpen?: () => void;
  onHoverClose?: () => void;
}) {
  return (
    <>
      {/* Bouton fermé — version compacte. Hover ouvre automatiquement
          (desktop) ; click ouvre aussi (mobile/tactile + accessibilité clavier). */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          onMouseEnter={onHoverOpen}
          onMouseLeave={onHoverClose}
          className={[
            "absolute top-4 left-4 z-10 items-center gap-2 px-3.5 py-2 rounded-full bg-white text-ink font-medium text-[13px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-[color:var(--line)] hover:bg-[color:var(--brand)] hover:text-white hover:border-transparent transition",
            hideTrigger ? "hidden lg:inline-flex" : "inline-flex",
          ].join(" ")}
          aria-label="Ouvrir les filtres"
        >
          <SlidersHorizontal size={14} />
          Filtres
        </button>
      )}

      {/* Panel ouvert */}
      {open && (
        <>
          {/* Backdrop mobile only — clic pour fermer */}
          <button
            type="button"
            aria-label="Fermer les filtres"
            onClick={() => setOpen(false)}
            className="lg:hidden fixed inset-0 z-[9] bg-black/30 backdrop-blur-[2px]"
          />
          <div
            onMouseEnter={onHoverOpen}
            onMouseLeave={onHoverClose}
            className={[
              "absolute z-20 bg-white overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.18)]",
              // Mobile : bottom-sheet plein largeur
              "inset-x-0 bottom-0 max-h-[82dvh] overflow-y-auto rounded-t-2xl border-t border-[color:var(--line)] pb-[env(safe-area-inset-bottom)]",
              // Desktop : panneau top-left avec animation slide-in (filters-panel-enter dans globals.css)
              "lg:inset-x-auto lg:bottom-auto lg:top-4 lg:left-4 lg:w-[340px] lg:max-w-[calc(100vw-32px)] lg:max-h-none lg:overflow-hidden lg:rounded-2xl lg:border lg:border-[color:var(--line)] lg:filters-panel-enter lg:pb-0",
            ].join(" ")}
            role="dialog"
            aria-label="Filtres carte"
          >
            {/* Drag handle mobile */}
            <div className="lg:hidden flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-[color:var(--line)]" aria-hidden="true" />
            </div>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[color:var(--line-soft)]">
              <div className="flex items-center gap-2 text-ink font-medium text-[15px]">
                <SlidersHorizontal size={17} className="text-brand-strong" />
                Filtres
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-ink-soft hover:text-ink hover:bg-surface-warm min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-5 space-y-6">
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
          </div>
          </div>
        </>
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
