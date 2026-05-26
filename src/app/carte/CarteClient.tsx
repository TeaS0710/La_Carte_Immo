"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { communeDataUrl } from "@/lib/url";
import { History, Info, Box, Printer, Maximize2, Minimize2, MapPin, MoreVertical, X, Target, Hammer } from "lucide-react";
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
  // Timer pour le hover-to-open / hover-to-close des menus déroulants
  const actionsCloseTimerRef = useRef<number | null>(null);
  const cancelActionsClose = () => {
    if (actionsCloseTimerRef.current !== null) {
      window.clearTimeout(actionsCloseTimerRef.current);
      actionsCloseTimerRef.current = null;
    }
  };
  const scheduleActionsClose = () => {
    cancelActionsClose();
    // Délai 200 ms pour permettre à la souris de transiter du bouton vers le popover
    actionsCloseTimerRef.current = window.setTimeout(() => setActionsOpen(false), 200);
  };
  const filtersCloseTimerRef = useRef<number | null>(null);
  const cancelFiltersClose = () => {
    if (filtersCloseTimerRef.current !== null) {
      window.clearTimeout(filtersCloseTimerRef.current);
      filtersCloseTimerRef.current = null;
    }
  };
  const scheduleFiltersClose = () => {
    cancelFiltersClose();
    filtersCloseTimerRef.current = window.setTimeout(() => setFiltersOpen(false), 200);
  };
  // Helpers : ne déclencher le hover que sur devices avec souris (pas mobile)
  const isHoverDevice = () =>
    typeof window !== "undefined" && window.matchMedia?.("(hover: hover)").matches;

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

      {/* Barre de navigation flottante top-center : breadcrumb + sélecteur ville
          Mobile (< lg) : compacte, top-[72px] (sous le header global), cachée si
                          une card de détail est ouverte (évite chevauchement avec
                          le drag-handle et le header de la bottom-sheet).
          Desktop (≥ lg) : top-4 centered avec sélecteur ville visible. */}
      {(() => {
        const anyCardOpen = !!(selected || selectedIris || selectedPipeline || selectedPermit);
        return (
          <div className={`no-presentation absolute z-20 left-1/2 -translate-x-1/2 top-[72px] lg:top-4 flex flex-col lg:flex-row items-center gap-2 bg-white/95 backdrop-blur-sm border border-[color:var(--line)] rounded-full px-3 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.10)] max-w-[calc(100vw-120px)] lg:max-w-[calc(100vw-32px)] ${anyCardOpen ? "hidden lg:flex" : "flex"}`}>
            <CarteBreadcrumb
              items={[
                { label: deptName, href: `/carte/dept/${commune.code_dept}/` },
                { label: commune.nom },
              ]}
            />
            <span className="hidden lg:inline-block w-px h-4 bg-[color:var(--line)]" />
            <div className="hidden lg:block">
              <VilleSelector availableSlugs={availableSlugs} currentSlug={commune.slug} compact />
            </div>
          </div>
        );
      })()}

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

      {/* Filters bubble (top-left) — bouton fermé caché sur mobile quand card de
          détail ouverte. Hover desktop : ouverture auto + fermeture délai 200 ms. */}
      <FiltersBubble
        open={filtersOpen}
        setOpen={setFiltersOpen}
        filters={filters}
        setFilters={setFilters}
        minYear={minYear}
        maxYear={maxYear}
        hideTrigger={!!(selected || selectedIris || selectedPipeline || selectedPermit)}
        onHoverOpen={() => { if (isHoverDevice()) { cancelFiltersClose(); setFiltersOpen(true); } }}
        onHoverClose={() => { if (isHoverDevice()) scheduleFiltersClose(); }}
      />

      {/* Right-side action stack — uniformisé desktop + mobile pour éviter superpositions
          Layout : Historique → Prédire les futures ventes → Vue IDF → ⋮ menu (3D / Bâtiments / PDF / Présentation)
          Sur mobile (< sm), masquée quand une card de détail (rue, quartier, pipeline, permis) est ouverte
          afin de ne pas chevaucher la bottom-sheet — l'utilisateur ferme la card (X / drag) pour récupérer l'accès.
      */}
      {(() => {
        const anyCardOpen = !!(selected || selectedIris || selectedPipeline || selectedPermit);
        // Feedback tactile commun (squeeze 95% au clic, ombre intérieure légère)
        const btnFeedback = "transition-all duration-150 ease-out active:scale-[0.95] active:shadow-inner";
        return (
      <div
        className={[
          // Sur tablette portrait & mobile, on cache la stack quand une card est
          // ouverte (la bottom-sheet prend tout l'écran). Au-delà de lg (1024px),
          // l'IrisCard devient une carte flottante centrée et la stack reste utile.
          "no-presentation absolute top-[140px] right-4 z-30 flex flex-col items-end gap-2",
          anyCardOpen ? "hidden lg:flex" : "flex",
        ].join(" ")}
      >
        {/* 1. Prédire les futures ventes — XL, action primaire (brand)
            Hover desktop : le label se développe en 'Prédire les futures ventes'.
            On retire le gap du flex parent pour ne pas créer d'espace entre les
            spans (un gap appliqué autour d'un grid 0fr reste visible). Le gap
            entre l'icône et le texte est porté par mr-2.5 sur l'icône. */}
        {(dataState?.hasPipeline ?? true) && (
          <button
            type="button"
            onClick={() => setFilters({ ...filters, showPipeline: !filters.showPipeline })}
            aria-pressed={filters.showPipeline}
            title={
              filters.showPipeline
                ? "Masquer la prédiction des ventes (modèle DPE F/G × historique DVF)"
                : "Afficher les logements à fort potentiel de vente sur 12 mois (DPE F/G + modèle de prédiction)"
            }
            className={`group/predict inline-flex items-center px-5 py-3.5 rounded-full font-semibold text-[15px] min-h-[48px] ${btnFeedback} ${
              filters.showPipeline
                ? "bg-brand-strong text-white shadow-[0_4px_20px_rgba(157,126,68,0.55)] ring-2 ring-brand/30 hover:bg-brand"
                : "bg-brand text-white shadow-[0_4px_16px_rgba(157,126,68,0.35)] hover:bg-brand-strong hover:shadow-[0_6px_22px_rgba(157,126,68,0.50)]"
            }`}
          >
            <Target size={18} className={`mr-2.5 ${filters.showPipeline ? "animate-pulse" : ""}`} />
            <span>Prédire</span>
            {/* Wrapper grid 0fr → 1fr au hover desktop : pousse fluidement la largeur */}
            <span className="hidden lg:inline-grid grid-cols-[0fr] group-hover/predict:grid-cols-[1fr] transition-[grid-template-columns] duration-300 ease-out">
              <span className="overflow-hidden whitespace-nowrap">&nbsp;les futures</span>
            </span>
            <span>&nbsp;ventes</span>
          </button>
        )}

        {/* 2. Historique — passé en blanc (action secondaire, action primaire = Prédire ventes) */}
        <button
          type="button"
          onClick={() => setMarketOpen(true)}
          className={`inline-flex items-center gap-2 px-4 py-3 rounded-full bg-white text-ink border border-[color:var(--line)] font-medium text-[14px] shadow-[0_4px_14px_rgba(0,0,0,0.10)] hover:bg-surface-warm hover:border-brand hover:text-brand-strong min-h-[44px] ${btnFeedback}`}
        >
          <History size={16} className="text-brand-strong" />
          Historique
        </button>

        {/* 3. Vue 3D — bouton M (encore plus petit) */}
        <button
          type="button"
          onClick={() => setIs3d((v) => !v)}
          aria-pressed={is3d}
          aria-label={is3d ? "Désactiver la vue 3D" : "Activer la vue 3D"}
          title={is3d ? "Revenir en vue plate" : "Passer en vue 3D (relief des bâtiments)"}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full font-medium text-[13px] shadow-[0_3px_12px_rgba(0,0,0,0.10)] border min-h-[40px] focus:outline-none focus:ring-2 focus:ring-brand-strong focus:ring-offset-2 ${btnFeedback} ${
            is3d
              ? "bg-brand text-white border-brand hover:bg-brand-strong"
              : "bg-white text-ink border-[color:var(--line)] hover:bg-surface-warm hover:border-brand"
          }`}
        >
          <Box size={14} aria-hidden="true" />
          {is3d ? "3D activée" : "Vue 3D"}
        </button>

        {/* 4. IDF — bouton S (le plus petit avec texte) */}
        <a
          href="/carte/"
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium text-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] border bg-white text-ink-soft border-[color:var(--line)] hover:bg-surface-warm hover:border-brand hover:text-ink min-h-[36px] ${btnFeedback}`}
          title="Revenir à la vue Île-de-France entière"
        >
          <MapPin size={12} className="text-brand-strong" aria-hidden="true" />
          IDF
        </a>

        {/* 5. Menu ⋮ — popover ; ouverture hover desktop + click mobile, fermeture
            avec délai 200 ms pour laisser le temps de transiter vers le popover. */}
        <button
          type="button"
          onClick={() => setActionsOpen((v) => !v)}
          onMouseEnter={() => { if (isHoverDevice()) { cancelActionsClose(); setActionsOpen(true); } }}
          onMouseLeave={() => { if (isHoverDevice()) scheduleActionsClose(); }}
          aria-expanded={actionsOpen}
          aria-haspopup="menu"
          aria-label={actionsOpen ? "Fermer les autres actions" : "Autres actions"}
          title="Autres actions : Bâtiments modifiés, PDF, Présentation"
          className={`inline-flex items-center justify-center w-11 h-11 rounded-full font-medium text-[13px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] border ${btnFeedback} ${
            actionsOpen
              ? "bg-brand text-white border-brand"
              : "bg-white text-ink border-[color:var(--line)] hover:bg-surface-warm hover:border-brand"
          }`}
        >
          {actionsOpen ? <X size={18} /> : <MoreVertical size={18} />}
        </button>
      </div>
        );
      })()}

      {/* Popover du menu ⋮ — rendu HORS du wrapper stack pour échapper à
          tout overflow et bug de positionnement. `fixed` ancré aux coords du
          stack (top: ~328px = top-[140px] + 5 boutons × ~46px + gaps, right: 16px).
      */}
      {actionsOpen && (
        <>
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setActionsOpen(false)}
            className="fixed inset-0 z-40 bg-black/20 sm:bg-black/10"
          />
          <div
            role="menu"
            onMouseEnter={cancelActionsClose}
            onMouseLeave={() => { if (isHoverDevice()) scheduleActionsClose(); }}
            className="fixed z-50 flex flex-col items-stretch gap-1 w-[220px] bg-white border border-[color:var(--line)] rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.22)] p-2 right-4 top-[336px] no-presentation menu-popover-enter"
          >
            {/* Bâtiments modifiés (couche permis) */}
            {(dataState?.hasPermits ?? true) && (
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={filters.showPermits}
                onClick={() => { setFilters({ ...filters, showPermits: !filters.showPermits }); setActionsOpen(false); }}
                title="Afficher les permis de construire / cadastre récents"
                className={`inline-flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13.5px] min-h-[44px] transition-all duration-150 active:scale-[0.97] ${
                  filters.showPermits
                    ? "bg-brand text-white"
                    : "text-ink hover:bg-surface-warm"
                }`}
              >
                <Hammer size={15} aria-hidden="true" />
                <span className="flex-1 text-left">Bâtiments modifiés</span>
                {filters.showPermits && <span className="text-[10px]">●</span>}
              </button>
            )}

            {/* PDF */}
            <button
              type="button"
              role="menuitem"
              onClick={() => { window.print(); setActionsOpen(false); }}
              className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13.5px] min-h-[44px] text-ink hover:bg-surface-warm transition-all duration-150 active:scale-[0.97]"
            >
              <Printer size={15} aria-hidden="true" />
              <span className="flex-1 text-left">Exporter en PDF</span>
            </button>

            {/* Mode présentation */}
            <button
              type="button"
              role="menuitem"
              onClick={() => { setPresentation(true); setActionsOpen(false); }}
              className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13.5px] min-h-[44px] text-ink hover:bg-surface-warm transition-all duration-150 active:scale-[0.97]"
            >
              <Maximize2 size={15} aria-hidden="true" />
              <span className="flex-1 text-left">Mode présentation</span>
            </button>
          </div>
        </>
      )}

      {/* Legend (bottom-left) — fusion: ronds=rues, fond=quartiers
          Masquée sur mobile (< sm) si une carte de détail est ouverte pour ne
          pas cacher l'info utile. */}
      <div
        aria-label="Légende de la carte : intensité du volume de ventes, du plus faible au plus fort. Ronds = rues. Fonds colorés = quartiers IRIS."
        className={`no-presentation absolute bottom-4 left-4 z-10 bg-white rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.10)] border border-[color:var(--line)] px-4 py-3 text-[13px] text-ink max-w-[calc(100vw-32px)] ${
          (selected || selectedIris || selectedPipeline || selectedPermit)
            ? "hidden lg:block"
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
