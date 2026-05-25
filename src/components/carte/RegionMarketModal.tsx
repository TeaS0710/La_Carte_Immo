"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, History } from "lucide-react";
import {
  Bar, CartesianGrid, ComposedChart, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { assetUrl } from "@/lib/url";
import { useEscape } from "@/lib/useEscape";

interface CommuneSummary {
  code_insee: string;
  slug: string;
  nom: string;
  population: number;
  total_sales: number;
  median_price?: number | null;
  median_price_per_sqm?: number | null;
}

interface DeptSummary {
  code_dept: string;
  nom_dept: string;
  communes_count_total: number;
  communes_count_available: number;
  total_sales: number;
}

interface RegionPayload {
  region_slug: string;
  nom_region: string;
  depts: DeptSummary[];
  communes_count_total: number;
  communes_count_available: number;
  total_sales_available: number;
  population_total: number;
  top_communes: CommuneSummary[];
  insights?: string[];
  by_year?: { year: number; sales: number; median_price: number | null }[];
}

type Tab = "evolution" | "depts" | "top";

const TABS: { id: Tab; label: string }[] = [
  { id: "evolution", label: "Évolution dans le temps" },
  { id: "depts", label: "Par département" },
  { id: "top", label: "Top communes" },
];

export default function RegionMarketModal({ onClose }: { onClose: () => void }) {
  useEscape(true, onClose);
  const [region, setRegion] = useState<RegionPayload | null>(null);
  const [tab, setTab] = useState<Tab>("evolution");

  useEffect(() => {
    fetch(assetUrl("/data/idf/region.json"))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setRegion)
      .catch(() => setRegion(null));
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="La Carte Prelys — Historique régional"
      className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white w-full md:max-w-3xl md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-[color:var(--line)] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-ink font-medium text-[15px]">
            <History size={18} className="text-brand-strong" />
            La Carte Prelys — Historique régional Île-de-France
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
          {!region ? (
            <div className="rounded-lg border border-[color:var(--line)] bg-surface-warm p-5 text-[13px] text-ink-soft animate-pulse">
              Chargement des données régionales…
            </div>
          ) : (
            <>
              {tab === "evolution" && <EvolutionTab region={region} />}
              {tab === "depts" && <DeptsTab region={region} />}
              {tab === "top" && <TopTab region={region} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function fmt(n: number) { return n.toLocaleString("fr-FR"); }
function fmtEur(n?: number | null) { return n == null ? "—" : `${Math.round(n).toLocaleString("fr-FR")} €`; }

function Delta({ label, value }: { label: string; value: number }) {
  const positive = value >= 0;
  return (
    <div className="rounded-lg border border-[color:var(--line)] bg-white px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.12em] text-ink-soft mb-1">{label}</div>
      <div className={`text-[20px] font-semibold tabular ${positive ? "text-brand-strong" : "text-terracotta"}`}>
        {positive ? "+" : ""}{value} %
      </div>
    </div>
  );
}

function EvolutionTab({ region }: { region: RegionPayload }) {
  const data = region.by_year ?? [];
  if (data.length === 0) {
    return <p className="text-[13px] text-ink-soft">Pas de données temporelles régionales.</p>;
  }
  const first = data[0];
  const last = data[data.length - 1];
  const salesDelta = first.sales > 0
    ? Math.round(((last.sales - first.sales) / first.sales) * 100)
    : 0;
  const priceDelta = first.median_price && last.median_price
    ? Math.round(((last.median_price - first.median_price) / first.median_price) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <p className="text-ink-soft text-[15px] leading-relaxed">
        Volume des transactions et prix médian par année sur l&apos;ensemble
        des {region.communes_count_available} communes IDF analysées
        ({fmt(region.total_sales_available)} ventes DVF cumulées).
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Delta label={`Ventes ${first.year} → ${last.year}`} value={salesDelta} />
        <Delta label={`Prix médian ${first.year} → ${last.year}`} value={priceDelta} />
      </div>

      <div>
        <div className="text-[12px] uppercase tracking-[0.12em] text-ink-soft mb-2">
          Volume des ventes par année (IDF agrégé)
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={data}>
            <CartesianGrid stroke="#eaecef" vertical={false} />
            <XAxis dataKey="year" stroke="#9b9690" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis stroke="#9b9690" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round((v as number) / 1000)} k`} />
            <Tooltip
              contentStyle={{ background: "white", border: "1px solid #eaecef", borderRadius: 8, fontSize: 13 }}
              formatter={(v) => fmt(Number(v))}
            />
            <Bar dataKey="sales" fill="#c09b5a" radius={[4, 4, 0, 0]} name="Ventes" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div>
        <div className="text-[12px] uppercase tracking-[0.12em] text-ink-soft mb-2">
          Prix médian par année (€)
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid stroke="#eaecef" vertical={false} />
            <XAxis dataKey="year" stroke="#9b9690" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis stroke="#9b9690" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round((v as number) / 1000)} k`} domain={["auto", "auto"]} />
            <Tooltip
              contentStyle={{ background: "white", border: "1px solid #eaecef", borderRadius: 8, fontSize: 13 }}
              formatter={(v) => fmtEur(Number(v))}
            />
            <Line type="monotone" dataKey="median_price" stroke="#9d7e44" strokeWidth={2.5} dot={{ r: 4, fill: "#9d7e44" }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function DeptsTab({ region }: { region: RegionPayload }) {
  return (
    <div className="space-y-4">
      <p className="text-ink-soft text-[15px] leading-relaxed">
        Couverture et activité par département IDF. Cliquez sur un département
        pour ouvrir sa carte interactive.
      </p>
      <div className="border border-[color:var(--line)] rounded-xl overflow-hidden bg-white">
        <table className="w-full text-[14px]">
          <thead className="bg-surface-warm text-[11px] uppercase tracking-[0.1em] text-ink-soft">
            <tr>
              <th className="text-left px-4 py-2.5">Département</th>
              <th className="text-right px-4 py-2.5">Couverture</th>
              <th className="text-right px-4 py-2.5">Ventes DVF</th>
              <th className="text-right px-4 py-2.5">&nbsp;</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--line-soft)]">
            {region.depts.map((d) => {
              const pct = d.communes_count_total > 0
                ? Math.round((d.communes_count_available / d.communes_count_total) * 100)
                : 0;
              return (
                <tr key={d.code_dept}>
                  <td className="px-4 py-2.5 text-ink font-medium">
                    {d.nom_dept} <span className="text-ink-mute font-normal">({d.code_dept})</span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular text-ink-soft">
                    {d.communes_count_available} / {d.communes_count_total}
                    <span className="text-ink-mute"> · {pct} %</span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular text-ink">{fmt(d.total_sales)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {d.communes_count_available > 0 && (
                      <Link href={`/carte/dept/${d.code_dept}`} className="text-brand-strong hover:text-ink text-[13px]">
                        Voir →
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TopTab({ region }: { region: RegionPayload }) {
  return (
    <div className="space-y-4">
      <p className="text-ink-soft text-[15px] leading-relaxed">
        Top 30 communes IDF par volume de transactions DVF 2021-2025 (parmi
        les {region.communes_count_available} couvertes).
      </p>
      <div className="border border-[color:var(--line)] rounded-xl overflow-hidden bg-white">
        <table className="w-full text-[14px]">
          <thead className="bg-surface-warm text-[11px] uppercase tracking-[0.1em] text-ink-soft">
            <tr>
              <th className="text-left px-4 py-2.5">#</th>
              <th className="text-left px-4 py-2.5">Commune</th>
              <th className="text-right px-4 py-2.5">Ventes DVF</th>
              <th className="text-right px-4 py-2.5">Prix médian</th>
              <th className="text-right px-4 py-2.5">&nbsp;</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--line-soft)]">
            {region.top_communes.map((c, i) => (
              <tr key={c.code_insee}>
                <td className="px-4 py-2.5 text-ink-mute tabular w-8">{i + 1}</td>
                <td className="px-4 py-2.5 text-ink font-medium">{c.nom}</td>
                <td className="px-4 py-2.5 text-right tabular text-ink">{fmt(c.total_sales)}</td>
                <td className="px-4 py-2.5 text-right tabular text-ink-soft">{fmtEur(c.median_price)}</td>
                <td className="px-4 py-2.5 text-right">
                  <Link href={`/carte/ville/${c.slug}`} className="text-brand-strong hover:text-ink text-[13px]">
                    Carte →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
