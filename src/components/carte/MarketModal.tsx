"use client";

import { useEffect, useState } from "react";
import { assetUrl } from "@/lib/url";
import { useEscape } from "@/lib/useEscape";
import { X, LineChart as LineChartIcon, Target, Hammer } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CommuneStats } from "@/lib/types";
import { formatEur, formatNum } from "@/lib/format";
import type { MapFilters } from "./types";

type Tab = "evolution" | "projection" | "strates" | "couches";

const TABS: { id: Tab; label: string }[] = [
  { id: "evolution", label: "Évolution dans le temps" },
  { id: "projection", label: "Suivi des prix" },
  { id: "strates", label: "Profil de la population" },
  { id: "couches", label: "Couches d'analyse" },
];

export default function MarketModal({
  stats,
  onClose,
  initialTab = "evolution",
  filters,
  setFilters,
}: {
  stats: CommuneStats;
  onClose: () => void;
  initialTab?: Tab;
  filters: MapFilters;
  setFilters: (f: MapFilters) => void;
}) {
  useEscape(true, onClose);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="La Carte Prelys — Historique du marché"
      className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center"
      onClick={(e) => {
        // Ne fermer que si le clic est sur l'overlay lui-même, pas relâché après un drag
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white w-full md:max-w-3xl md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader onClose={onClose} />
        <ModalContent
          stats={stats}
          initialTab={initialTab}
          filters={filters}
          setFilters={setFilters}
        />
      </div>
    </div>
  );
}

function ModalHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="sticky top-0 bg-white border-b border-[color:var(--line)] px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-2.5 text-ink font-medium text-[15px]">
        <LineChartIcon size={18} className="text-brand-strong" />
        La Carte Prelys — Historique du marché
      </div>
      <button
        type="button"
        onClick={onClose}
        className="rounded-full p-2 text-ink-soft hover:text-ink hover:bg-surface-warm min-w-[40px] min-h-[40px] flex items-center justify-center"
        aria-label="Fermer"
      >
        <X size={20} />
      </button>
    </div>
  );
}

function ModalContent({
  stats,
  initialTab,
  filters,
  setFilters,
}: {
  stats: CommuneStats;
  initialTab: Tab;
  filters: MapFilters;
  setFilters: (f: MapFilters) => void;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <>
      <div role="tablist" className="flex gap-1 px-6 pt-4 pb-2 border-b border-[color:var(--line-soft)] overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition shrink-0 min-h-[40px] ${
              tab === t.id
                ? "bg-brand text-white"
                : "text-ink-soft hover:text-ink hover:bg-surface-warm"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {tab === "evolution" && <EvolutionTab stats={stats} />}
        {tab === "projection" && <ProjectionTab stats={stats} />}
        {tab === "strates" && <StratesTab />}
        {tab === "couches" && <CouchesTab filters={filters} setFilters={setFilters} />}
      </div>
    </>
  );
}

function CouchesTab({
  filters,
  setFilters,
}: {
  filters: MapFilters;
  setFilters: (f: MapFilters) => void;
}) {
  return (
    <div className="space-y-5">
      <p className="text-ink-soft text-[15px] leading-relaxed">
        Activez les couches d&apos;analyse à superposer sur la carte. Ces
        couches révèlent les opportunités de prospection : logements à fort
        potentiel de mise en vente et bâtiments récemment modifiés (proxy des
        permis de construire).
      </p>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setFilters({ ...filters, showPipeline: !filters.showPipeline })}
          className={`w-full inline-flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border text-[14px] transition ${
            filters.showPipeline
              ? "bg-brand border-brand text-white"
              : "bg-white border-[color:var(--line)] text-ink-soft hover:border-brand hover:text-ink"
          }`}
        >
          <span className="inline-flex items-center gap-3">
            <Target size={18} />
            <span className="text-left">
              <span className="block font-medium">Logements à fort potentiel</span>
              <span className={`block text-[12px] mt-0.5 ${filters.showPipeline ? "text-white/85" : "text-ink-mute"}`}>
                7 922 candidats — DPE F/G + bâti ancien sur quartiers actifs
              </span>
            </span>
          </span>
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
              filters.showPipeline ? "bg-white/20 text-white" : "bg-surface-warm text-ink-mute"
            }`}
          >
            {filters.showPipeline ? "Activée" : "Activer"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilters({ ...filters, showPermits: !filters.showPermits })}
          className={`w-full inline-flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border text-[14px] transition ${
            filters.showPermits
              ? "bg-brand border-brand text-white"
              : "bg-white border-[color:var(--line)] text-ink-soft hover:border-brand hover:text-ink"
          }`}
        >
          <span className="inline-flex items-center gap-3">
            <Hammer size={18} />
            <span className="text-left">
              <span className="block font-medium">Bâtiments modifiés (2019-2026)</span>
              <span className={`block text-[12px] mt-0.5 ${filters.showPermits ? "text-white/85" : "text-ink-mute"}`}>
                1 005 points — mises à jour cadastrales IGN (permis, extensions, divisions)
              </span>
            </span>
          </span>
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
              filters.showPermits ? "bg-white/20 text-white" : "bg-surface-warm text-ink-mute"
            }`}
          >
            {filters.showPermits ? "Activée" : "Activer"}
          </span>
        </button>
      </div>

      <p className="text-[11px] text-ink-mute leading-relaxed pt-3 border-t border-[color:var(--line-soft)]">
        Cliquez sur un point pour ouvrir sa fiche avec les liens directs vers
        Pages Jaunes, Pages Blanches, Pappers et Street View. Les fiches
        ouvrent toujours dans un nouvel onglet, sans redirection automatique.
      </p>
    </div>
  );
}

/* ---------- Sub-content ---------- */

function EvolutionTab({ stats }: { stats: CommuneStats }) {
  const data = stats.by_year;
  const first = data[0];
  const last = data[data.length - 1];
  const salesDelta = Math.round(((last.sales - first.sales) / first.sales) * 100);
  const priceDelta = Math.round(((last.median_price - first.median_price) / first.median_price) * 100);

  return (
    <div className="space-y-6">
      <p className="text-ink-soft text-[15px] leading-relaxed">
        Volume de ventes et prix médian par année sur Saint-Maur, à partir des
        Demandes de Valeurs Foncières (DGFiP, données officielles).
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Delta label={`Ventes ${first.year} → ${last.year}`} value={salesDelta} />
        <Delta label={`Prix médian ${first.year} → ${last.year}`} value={priceDelta} />
      </div>

      <ChartBlock title="Nombre de ventes par année">
        <ComposedChart data={data}>
          <CartesianGrid stroke="#eaecef" vertical={false} />
          <XAxis dataKey="year" stroke="#9b9690" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis stroke="#9b9690" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNum(v as number)} />
          <Tooltip
            contentStyle={{ background: "white", border: "1px solid #eaecef", borderRadius: 8, fontSize: 13 }}
            formatter={(v) => formatNum(Number(v))}
          />
          <Bar dataKey="sales" fill="#e0cda3" radius={[6, 6, 0, 0]} />
        </ComposedChart>
      </ChartBlock>

      <ChartBlock title="Prix médian de vente">
        <LineChart data={data}>
          <CartesianGrid stroke="#eaecef" vertical={false} />
          <XAxis dataKey="year" stroke="#9b9690" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis stroke="#9b9690" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round((v as number) / 1000)} k`} />
          <Tooltip
            contentStyle={{ background: "white", border: "1px solid #eaecef", borderRadius: 8, fontSize: 13 }}
            formatter={(v) => formatEur(Number(v))}
          />
          <Line type="monotone" dataKey="median_price" stroke="#9d7e44" strokeWidth={2.5} dot={{ r: 4, fill: "#9d7e44" }} activeDot={{ r: 6 }} />
        </LineChart>
      </ChartBlock>
    </div>
  );
}

function ProjectionTab({ stats }: { stats: CommuneStats }) {
  const [proj, setProj] = useState<ProjectionData | null>(null);
  useEffect(() => {
    fetch(assetUrl("/data/saint-maur/projection.json"))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setProj)
      .catch(() => setProj(null));
  }, []);

  if (!proj) {
    return (
      <div className="space-y-5">
        <p className="text-ink-soft text-[15px] leading-relaxed">
          Chargement des données de projection…
        </p>
        <FallbackYearly stats={stats} />
      </div>
    );
  }

  const obs = proj.monthly_observed;

  const series: Record<string, number | string | null>[] = obs.map((o) => ({
    month: o.month,
    observed: o.median_price_smooth,
  }));

  return (
    <div className="space-y-6">
      <p className="text-ink-soft text-[15px] leading-relaxed">
        Suivi mensuel du prix médian de vente sur Saint-Maur depuis 2021,
        à partir des transactions DVF officielles (DGFiP).
      </p>

      <ChartBlock title="Prix médian mensuel observé">
        <ComposedChart data={series.filter((s) => s.observed != null)} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <CartesianGrid stroke="#eaecef" vertical={false} />
          <XAxis
            dataKey="month"
            stroke="#9b9690"
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(m) => String(m).slice(0, 7)}
            minTickGap={40}
          />
          <YAxis
            stroke="#9b9690"
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${Math.round((v as number) / 1000)} k`}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{ background: "white", border: "1px solid #eaecef", borderRadius: 8, fontSize: 13 }}
            formatter={(v: unknown) => (v == null ? "-" : formatEur(Number(v)))}
            labelFormatter={(l: unknown) => String(l).slice(0, 7)}
          />
          <Line
            type="monotone"
            dataKey="observed"
            stroke="#9d7e44"
            strokeWidth={2.5}
            dot={false}
            name="Prix médian"
          />
        </ComposedChart>
      </ChartBlock>

      <p className="text-[12px] text-ink-mute leading-relaxed border-t border-[color:var(--line-soft)] pt-3">
        Estimation à titre indicatif basée sur les transactions DVF officielles
        (DGFiP). Le marché immobilier dépend aussi de facteurs économiques
        externes (taux d&apos;intérêt, politique monétaire) qui peuvent faire
        varier le résultat. À ne pas considérer comme une recommandation
        d&apos;investissement.
      </p>
    </div>
  );
}

interface ProjectionData {
  horizon_months: number;
  best_model: string;
  monthly_observed: { month: string; median_price: number; median_price_smooth: number; sales: number }[];
  models: Record<string, { r2_train: number; r2_test: number | null; mape_test: number | null }>;
  best_forecast: {
    months: string[];
    point: number[];
    ci_10: number[];
    ci_90: number[];
    ci_5?: number[];
    ci_95?: number[];
  };
  validation: {
    train_months: number;
    test_months: number;
    comparison: Record<string, { r2_train: number | null; r2_test: number | null; mape_test_pct: number | null }>;
  };
}

/** Fallback simple yearly view if monthly projection data not available */
function FallbackYearly({ stats }: { stats: CommuneStats }) {
  const observed = stats.by_year.map((y) => ({ year: y.year, value: y.median_price }));
  const fit = linearFit(observed);
  const lastYear = Math.max(...observed.map((p) => p.year));
  const nextPred = fit.a * (lastYear + 1) + fit.b;
  return (
    <div className="grid grid-cols-2 gap-3">
      <BigStat label="Linéaire annuel" value={formatEur(nextPred)} sub={`R² ${(fit.r2 * 100).toFixed(0)} %`} positive={fit.r2 > 0.5} />
    </div>
  );
}

// Vraies données agrégées commune (issues de scripts/enrich_iris_aggregates.py)
// disponibles via /data/saint-maur/commune.json — chargées en client.

function StratesTab() {
  const [commune, setCommune] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    fetch(assetUrl("/data/saint-maur/commune.json"))
      .then((r) => r.json())
      .then(setCommune)
      .catch(() => setCommune(null));
  }, []);

  if (!commune) {
    return <div className="text-sm text-ink-mute">Chargement des indicateurs commune…</div>;
  }

  const csp = [
    { name: "Cadres & prof. sup.", part: commune.pct_cadres ?? 0 },
    { name: "Bac+5 et plus", part: commune.pct_bac5p ?? 0 },
  ].filter((d) => d.part > 0);

  const tenants = [
    { name: "Propriétaires", part: commune.pct_proprio ?? 0 },
    { name: "Locataires (incl. HLM)", part: Math.max(0, 100 - (commune.pct_proprio ?? 0)) },
  ];

  const types = [
    { name: "Appartements", part: commune.pct_appart ?? 0 },
    { name: "Maisons", part: Math.max(0, 100 - (commune.pct_appart ?? 0)) },
  ];

  return (
    <div className="space-y-6">
      <p className="text-ink-soft text-[15px] leading-relaxed">
        Indicateurs agrégés sur les <strong>34 IRIS</strong> de Saint-Maur,
        pondérés par population et par parc de logements. Source : INSEE 2021.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <CommuneStat label="Habitants" value={Number(commune.population).toLocaleString("fr-FR")} unit="hab." />
        <CommuneStat label="Logements" value={Number(commune.n_log).toLocaleString("fr-FR")} unit="" />
      </div>

      <BarBlock title="Profil de qualification (% de la population active)" data={csp} />
      <BarBlock title="Statut d'occupation des logements" data={tenants} />
      <BarBlock title="Type de logements" data={types} />

      <p className="text-xs text-ink-mute leading-relaxed border-t border-[color:var(--line-soft)] pt-3">
        Source : INSEE, bases infracommunales 2021 (population, logement, CSP,
        diplômes). Cliquez sur un quartier sur la carte pour voir son profil
        détaillé et son rang sur chaque indicateur.
      </p>
    </div>
  );
}

function CommuneStat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-lg px-3 py-2.5 border border-[color:var(--line)] bg-surface-warm">
      <div className="text-[10px] uppercase tracking-[0.15em] text-ink-mute mb-0.5">
        {label}
      </div>
      <div className="tabular text-lg font-semibold text-ink">
        {value} <span className="text-xs text-ink-mute font-normal">{unit}</span>
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */

function ChartBlock({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <section>
      <div className="text-[12px] uppercase tracking-[0.12em] text-ink-mute mb-3">
        {title}
      </div>
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </section>
  );
}

function BarBlock({
  title,
  data,
}: {
  title: string;
  data: { name: string; part: number }[];
}) {
  return (
    <section>
      <div className="text-[12px] uppercase tracking-[0.12em] text-ink-mute mb-2.5">
        {title}
      </div>
      <div className="space-y-1.5">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-3 text-[14px]">
            <div className="w-32 text-ink-soft shrink-0 truncate">{d.name}</div>
            <div className="flex-1 h-3 bg-[color:var(--line-soft)] rounded-full overflow-hidden">
              <div
                className="h-full bg-brand rounded-full"
                style={{ width: `${d.part}%` }}
              />
            </div>
            <div className="tabular w-12 text-right text-ink">{d.part} %</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Delta({ label, value }: { label: string; value: number }) {
  const positive = value >= 0;
  return (
    <div className="rounded-xl px-4 py-3 border border-[color:var(--line)] bg-surface-warm">
      <div className="text-[11px] uppercase tracking-[0.15em] text-ink-mute mb-1">
        {label}
      </div>
      <div className={`tabular text-xl font-medium ${positive ? "text-[color:var(--sage)]" : "text-terracotta"}`}>
        {value >= 0 ? "+" : ""}{value} %
      </div>
    </div>
  );
}

function BigStat({
  label,
  value,
  sub,
  positive,
}: {
  label: string;
  value: string;
  sub: string;
  positive: boolean;
}) {
  return (
    <div className="rounded-xl px-4 py-3 border border-[color:var(--brand-soft)] bg-[color:var(--brand-soft)]/20">
      <div className="text-[11px] uppercase tracking-[0.15em] text-ink-mute mb-1">{label}</div>
      <div className="tabular text-xl font-semibold text-brand-strong">{value}</div>
      <div className={`text-[12px] mt-0.5 ${positive ? "text-[color:var(--sage)]" : "text-terracotta"}`}>{sub}</div>
    </div>
  );
}

function linearFit(points: { year: number; value: number }[]) {
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.year, 0);
  const sumY = points.reduce((s, p) => s + p.value, 0);
  const sumXY = points.reduce((s, p) => s + p.year * p.value, 0);
  const sumXX = points.reduce((s, p) => s + p.year * p.year, 0);
  const a = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const b = (sumY - a * sumX) / n;
  const meanY = sumY / n;
  const ssRes = points.reduce((s, p) => {
    const pred = a * p.year + b;
    return s + (p.value - pred) ** 2;
  }, 0);
  const ssTot = points.reduce((s, p) => s + (p.value - meanY) ** 2, 0);
  const r2 = 1 - ssRes / ssTot;
  return { a, b, r2 };
}
