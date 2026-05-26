"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { communeDataUrl } from "@/lib/url";
import { History, Info, Box, Printer, Maximize2, Minimize2, MapPin, MoreVertical, X } from "lucide-react";
import type { CommuneStats, StreetProps } from "@/lib/types";
import { DEFAULT_COMMUNE, type CommuneRef } from "@/lib/commune";
import FiltersBubble from "@/components/carte/FiltersBubble";
import StreetCard from "@/components/carte/StreetCard";
import IrisCard from "@/components/carte/IrisCard";
import PipelineCard from "@/components/carte/PipelineCard";
import PermitCard from "@/components/carte/PermitCard";
import MarketModal from "@/components/carte/MarketModal";
import CarteMap from "@/components/carte/CarteMap";
import CarteBreadcrumb from "@/components/carte/CarteBreadcrumb";
import VilleSelector from "@/components/carte/VilleSelector";
import OnboardingHint from "@/components/carte/OnboardingHint";
import type {
  MapFilters, IrisProps, PipelineLogement, PermitFeature,
} from "@/components/carte/types";

const DEPT_NAMES: Record<string, string> = {
  "75": "Paris", "77": "Seine-et-Marne", "78": "Yvelines", "91": "Essonne",
  "92": "Hauts-de-Seine", "93": "Seine-Saint-Denis", "94": "Val-de-Marne", "95": "Val-d'Oise",
};

type PermitWithCoords = PermitFeature & { lng: number; lat: number };

interface DataState {
  hasIris: boolean;
  hasPipeline: boolean;
  hasAnalyses: boolean;
  hasPermits: boolean;
}

export default function CarteClient({
  stats,
  commune = DEFAULT_COMMUNE,
  availableSlugs = [],
  dataState,
}: {
  stats: CommuneStats;
  commune?: CommuneRef;
  availableSlugs?: string[];
  dataState?: DataState;
}) {
  const codeInsee = commune.code_insee;
  const deptName = DEPT_NAMES[commune.code_dept] ?? `Dept ${commune.code_dept}`;
  // "Partiel" si pas de pipeline (vrai indicateur commune complète DPE+IRIS).
  // Un iris.geojson "stub" (= contour commune entière) ne compte pas comme
  // complet — pipeline.geojson est l'indicateur fiable.
  const isPartial = dataState && !dataState.hasPipeline;
  const minYear = useMemo(() => Math.min(...stats.years_covered), [stats]);
  const maxYear = useMemo(() => Math.max(...stats.years_covered), [stats]);
  const [filters, setFilters] = useState<MapFilters>({
    yearRange: [minYear, maxYear],
    typeFilter: "all",
    viewMode: "dots",
    minSales: 3,
    showPipeline: false,
    showPermits: false,
  });
  const [selected, setSelected] = useState<StreetProps | null>(null);
  const [selectedIris, setSelectedIris] = useState<IrisProps | null>(null);
  const [selectedPipeline, setSelectedPipeline] = useState<PipelineLogement | null>(null);
  const [selectedPermit, setSelectedPermit] = useState<PermitWithCoords | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);
  const [is3d, setIs3d] = useState(false);
  const [presentation, setPresentation] = useState(false);
  // Mobile only : toggle de la stack d'actions secondaires
  const [actionsOpen, setActionsOpen] = useState(false);

  // Quand on sélectionne un truc, on ferme tous les autres
  const handleStreet = (s: StreetProps | null) => {
    setSelected(s);
    if (s) { setSelectedIris(null); setSelectedPipeline(null); setSelectedPermit(null); }
  };
  const handleIris = (i: IrisProps | null) => {
    setSelectedIris(i);
    if (i) { setSelected(null); setSelectedPipeline(null); setSelectedPermit(null); }
  };
  const handlePipeline = (p: PipelineLogement | null) => {
    setSelectedPipeline(p);
    if (p) { setSelected(null); setSelectedIris(null); setSelectedPermit(null); }
  };
  const handlePermit = (p: PermitWithCoords | null) => {
    setSelectedPermit(p);
    if (p) { setSelected(null); setSelectedIris(null); setSelectedPipeline(null); }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const dismiss = () => setHintDismissed(true);
    document.addEventListener("click", dismiss, { once: true });
    return () => document.removeEventListener("click", dismiss);
  }, []);

  return (
    <main
      className={`relative w-full ${presentation ? "presentation-mode" : ""}`}
      style={{ height: "calc(100vh - 68px)" }}
    >
      {/* Bouton "Quitter présentation" visible uniquement en mode présentation */}
      <button
        type="button"
        onClick={() => setPresentation(false)}
        className="presentation-exit absolute top-4 right-4 z-30 items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-[color:var(--line)] text-[12px] text-ink font-medium shadow-md hover:bg-surface-warm transition"
      >
        <Minimize2 size={13} />
        Quitter présentation
      </button>
      {/* Bandeau "mode partiel" si la commune n'a pas encore les data avancées */}
      {isPartial && (
        <div className="no-presentation absolute top-[88px] left-1/2 -translate-x-1/2 z-10 bg-[color:var(--brand-soft)]/40 border border-[color:var(--brand-soft)] text-ink rounded-full px-3.5 py-1.5 text-[11px] font-medium shadow-sm max-w-[calc(100vw-32px)] text-center">
          ⓘ Cette commune dispose des transactions DVF — l&apos;analyse fine quartier par quartier arrive prochainement
        </div>
      )}

      {/* Barre de navigation flottante top-center : breadcrumb + sélecteur ville */}
      <div className="no-presentation absolute top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col sm:flex-row items-center gap-2 bg-white/95 backdrop-blur-sm border border-[color:var(--line)] rounded-full px-3 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.10)] max-w-[calc(100vw-32px)]">
        <CarteBreadcrumb
          items={[
            { label: deptName, href: `/carte/dept/${commune.code_dept}` },
            { label: commune.nom },
          ]}
        />
        <span className="hidden sm:inline-block w-px h-4 bg-[color:var(--line)]" />
        <VilleSelector availableSlugs={availableSlugs} currentSlug={commune.slug} compact />
      </div>

      {/* Map fills the whole area — only render after mount to avoid SSR/MapLibre conflict */}
      {mounted ? (
        <CarteMap
          codeInsee={codeInsee}
          communeName={commune.nom}
          center={[commune.lng ?? 2.4901, commune.lat ?? 48.8014]}
          filters={filters}
          selectedIrisCode={selectedIris?.code_iris ?? null}
          is3d={is3d}
          onSelectStreet={handleStreet}
          onSelectIris={handleIris}
          onSelectPipeline={handlePipeline}
          onSelectPermit={handlePermit}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-warm text-sm text-ink-mute">
          Chargement de la carte…
        </div>
      )}

      {/* Filters bubble (top-left) */}
      <FiltersBubble
        open={filtersOpen}
        setOpen={setFiltersOpen}
        filters={filters}
        setFilters={setFilters}
        minYear={minYear}
        maxYear={maxYear}
        hasPipeline={dataState?.hasPipeline ?? true}
        hasPermits={dataState?.hasPermits ?? true}
      />

      {/* Right-side action stack — desktop : tout visible ; mobile : 2 boutons principaux + menu repliable */}
      <div className="no-presentation absolute top-[140px] right-4 z-10 flex flex-col items-end gap-2 max-h-[calc(100vh-180px)] overflow-y-auto pr-0.5">
        {/* Bouton primaire toujours visible */}
        <button
          type="button"
          onClick={() => setMarketOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-3 rounded-full bg-brand text-white font-medium text-[15px] shadow-[0_4px_16px_rgba(157,126,68,0.35)] hover:bg-brand-strong transition min-h-[44px]"
        >
          <History size={17} />
          <span className="hidden sm:inline">Historique</span>
          <span className="sm:hidden">Historique</span>
        </button>

        {/* Bouton retour IDF toujours visible */}
        <Link
          href="/carte"
          prefetch
          className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full font-medium text-[13px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] border bg-white text-ink border-[color:var(--line)] hover:bg-surface-warm hover:border-brand transition min-h-[44px]"
          title="Revenir à la vue Île-de-France entière"
        >
          <MapPin size={14} className="text-brand-strong" aria-hidden="true" />
          <span className="hidden sm:inline">Vue Île-de-France</span>
          <span className="sm:hidden">IDF</span>
        </Link>

        {/* Toggle menu actions secondaires — visible uniquement mobile */}
        <button
          type="button"
          onClick={() => setActionsOpen((v) => !v)}
          aria-expanded={actionsOpen}
          aria-label={actionsOpen ? "Fermer le menu d'actions" : "Ouvrir les actions secondaires"}
          className="sm:hidden inline-flex items-center justify-center w-11 h-11 rounded-full font-medium text-[13px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] border bg-white text-ink border-[color:var(--line)] hover:bg-surface-warm transition"
        >
          {actionsOpen ? <X size={18} /> : <MoreVertical size={18} />}
        </button>

        {/* Actions secondaires — visibles desktop OU mobile-open */}
        <button
          type="button"
          onClick={() => setIs3d((v) => !v)}
          aria-pressed={is3d}
          aria-label={is3d ? "Désactiver la vue 3D" : "Activer la vue 3D"}
          title={is3d ? "Revenir en vue plate" : "Passer en vue 3D"}
          className={`${actionsOpen ? "flex" : "hidden"} sm:inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full font-medium text-[13px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] border transition min-h-[44px] focus:outline-none focus:ring-2 focus:ring-brand-strong focus:ring-offset-2 ${
            is3d
              ? "bg-brand text-white border-brand"
              : "bg-white text-ink border-[color:var(--line)] hover:bg-surface-warm"
          }`}
        >
          <Box size={15} aria-hidden="true" />
          3D
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          aria-label="Imprimer / Exporter PDF"
          title="Imprimer ou exporter cette fiche en PDF"
          className={`${actionsOpen ? "flex" : "hidden"} sm:inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full font-medium text-[13px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] border bg-white text-ink border-[color:var(--line)] hover:bg-surface-warm transition min-h-[44px] focus:outline-none focus:ring-2 focus:ring-brand-strong focus:ring-offset-2`}
        >
          <Printer size={15} aria-hidden="true" />
          PDF
        </button>
        <button
          type="button"
          onClick={() => setPresentation(true)}
          aria-label="Passer en mode présentation"
          title="Plein écran simplifié pour RDV client"
          className={`${actionsOpen ? "flex" : "hidden"} sm:inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full font-medium text-[13px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] border bg-white text-ink border-[color:var(--line)] hover:bg-surface-warm transition min-h-[44px] focus:outline-none focus:ring-2 focus:ring-brand-strong focus:ring-offset-2`}
        >
          <Maximize2 size={15} aria-hidden="true" />
          <span className="hidden sm:inline">Mode présentation</span>
          <span className="sm:hidden">Plein écran</span>
        </button>
      </div>

      {/* Legend (bottom-left) — fusion: ronds=rues, fond=quartiers
          Masquée sur mobile (< sm) si une carte de détail est ouverte pour ne
          pas cacher l'info utile. */}
      <div
        aria-label="Légende de la carte : intensité du volume de ventes, du plus faible au plus fort. Ronds = rues. Fonds colorés = quartiers IRIS."
        className={`no-presentation absolute bottom-4 left-4 z-10 bg-white rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.10)] border border-[color:var(--line)] px-4 py-3 text-[13px] text-ink max-w-[calc(100vw-32px)] ${
          (selected || selectedIris || selectedPipeline || selectedPermit)
            ? "hidden sm:block"
            : ""
        }`}
      >
        <div className="text-[11px] uppercase tracking-[0.15em] text-ink-mute mb-2">
          Volume de ventes
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-7 rounded-l-sm bg-[#d9e0d4]" />
          <span className="inline-block h-2.5 w-7 bg-[#a8b8a3]" />
          <span className="inline-block h-2.5 w-7 bg-[#e6cf9a]" />
          <span className="inline-block h-2.5 w-7 bg-[#c09b5a]" />
          <span className="inline-block h-2.5 w-7 bg-[#b54f3a]" />
          <span className="inline-block h-2.5 w-7 rounded-r-sm bg-[#7a2810]" />
        </div>
        <div className="flex items-center justify-between text-[11px] text-ink-mute mt-1 w-44">
          <span>Faible</span>
          <span>Fort</span>
        </div>
        <div className="text-[11px] text-ink-mute mt-2 pt-2 border-t border-[color:var(--line-soft)]">
          ● rues · ▢ quartiers IRIS
        </div>
      </div>

      {/* Hint inline central — disparaît au premier clic */}
      {!hintDismissed && !selected && !selectedIris && !selectedPipeline && !selectedPermit && !filtersOpen && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none transition-opacity">
          <div className="bg-white/95 border border-[color:var(--line)] rounded-full px-4 py-2 text-[13px] text-ink-soft inline-flex items-center gap-2 shadow-sm">
            <Info size={14} className="text-brand-strong" />
            Cliquez sur un point (rue) ou une zone (quartier) pour voir les détails
          </div>
        </div>
      )}

      {/* Onboarding 1re visite (persistant via localStorage) */}
      <OnboardingHint
        hasIrisLayer={!!dataState?.hasIris}
        hasInteracted={!!selectedIris}
      />

      {/* Selected street drawer (right panel) */}
      {selected && (
        <StreetCard
          codeInsee={codeInsee}
          communeName={commune.nom}
          street={selected}
          onClose={() => setSelected(null)}
          onOpenIris={async () => {
            const code = (selected as unknown as { code_iris?: string }).code_iris;
            if (!code) return;
            try {
              const res = await fetch(communeDataUrl(codeInsee, "iris.geojson"));
              if (!res.ok) return;
              const data = await res.json();
              const match = (data.features as { properties: IrisProps }[]).find(
                (f) => f.properties.code_iris === code,
              );
              if (match) {
                setSelectedIris(match.properties);
                setSelected(null);
              }
            } catch {
              /* iris.geojson absent ou invalide pour cette commune */
            }
          }}
        />
      )}

      {/* Selected IRIS floating card */}
      {selectedIris && !selected && !selectedPipeline && !selectedPermit && (
        <IrisCard codeInsee={codeInsee} communeName={commune.nom} iris={selectedIris} onClose={() => setSelectedIris(null)} />
      )}

      {/* Selected pipeline logement */}
      {selectedPipeline && (
        <PipelineCard logement={selectedPipeline} communeName={commune.nom} onClose={() => setSelectedPipeline(null)} />
      )}

      {/* Selected permit cadastre */}
      {selectedPermit && (
        <PermitCard permit={selectedPermit} communeName={commune.nom} onClose={() => setSelectedPermit(null)} />
      )}

      {/* Market modal — multi-onglets Historique */}
      {marketOpen && (
        <MarketModal
          codeInsee={codeInsee}
          stats={stats}
          onClose={() => setMarketOpen(false)}
          filters={filters}
        />
      )}
    </main>
  );
}
