"use client";

import { useEffect, useMemo, useState } from "react";
import { assetUrl } from "@/lib/url";
import { LineChart as LineChartIcon, Info } from "lucide-react";
import type { CommuneStats, StreetProps } from "@/lib/types";
import FiltersBubble from "@/components/carte/FiltersBubble";
import StreetCard from "@/components/carte/StreetCard";
import IrisCard from "@/components/carte/IrisCard";
import MarketModal from "@/components/carte/MarketModal";
import CarteMap from "@/components/carte/CarteMap";
import type { MapFilters, IrisProps } from "@/components/carte/types";

export default function CarteClient({ stats }: { stats: CommuneStats }) {
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  return (
    <main className="relative w-full" style={{ height: "calc(100vh - 68px)" }}>
      {/* Map fills the whole area — only render after mount to avoid SSR/MapLibre conflict */}
      {mounted ? (
        <CarteMap
          filters={filters}
          selectedIrisCode={selectedIris?.code_iris ?? null}
          onSelectStreet={setSelected}
          onSelectIris={setSelectedIris}
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
      />

      {/* Évolution / marché button (top-right under zoom controls) */}
      <button
        type="button"
        onClick={() => setMarketOpen(true)}
        className="absolute top-[140px] right-4 z-10 inline-flex items-center gap-2 px-4 py-3 rounded-full bg-brand text-white font-medium text-[15px] shadow-[0_4px_16px_rgba(157,126,68,0.35)] hover:bg-brand-strong transition min-h-[44px]"
      >
        <LineChartIcon size={17} />
        Évolution
      </button>


      {/* Legend (bottom-left) — fusion: ronds=rues, fond=quartiers */}
      <div className="absolute bottom-4 left-4 z-10 bg-white rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.10)] border border-[color:var(--line)] px-4 py-3 text-[13px] text-ink max-w-[calc(100vw-32px)]">
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

      {/* Hint when nothing selected yet */}
      {!selected && !selectedIris && !filtersOpen && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none">
          <div className="bg-white/95 border border-[color:var(--line)] rounded-full px-4 py-2 text-[13px] text-ink-soft inline-flex items-center gap-2 shadow-sm">
            <Info size={14} className="text-brand-strong" />
            Cliquez sur un point (rue) ou une zone (quartier) pour voir les détails
          </div>
        </div>
      )}

      {/* Selected street drawer (right panel) */}
      {selected && (
        <StreetCard
          street={selected}
          onClose={() => setSelected(null)}
          onOpenIris={async () => {
            const code = (selected as unknown as { code_iris?: string }).code_iris;
            if (!code) return;
            const data = await fetch(assetUrl("/data/saint-maur/iris.geojson")).then((r) => r.json());
            const match = (data.features as { properties: IrisProps }[]).find(
              (f) => f.properties.code_iris === code,
            );
            if (match) {
              setSelectedIris(match.properties);
              setSelected(null);
            }
          }}
        />
      )}

      {/* Selected IRIS floating card */}
      {selectedIris && !selected && (
        <IrisCard iris={selectedIris} onClose={() => setSelectedIris(null)} />
      )}

      {/* Market modal */}
      {marketOpen && (
        <MarketModal stats={stats} onClose={() => setMarketOpen(false)} />
      )}
    </main>
  );
}
