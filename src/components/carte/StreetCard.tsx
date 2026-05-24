"use client";

import { useEffect, useMemo, useState } from "react";
import { assetUrl } from "@/lib/url";
import {
  X,
  Home,
  Building2,
  MapPin,
  Download,
  TrendingUp,
  Users,
  Briefcase,
} from "lucide-react";
import type { StreetProps } from "@/lib/types";
import type { IrisProps } from "./types";
import { formatEur, formatEurPerSqm, formatNum, formatStreet } from "@/lib/format";
import ExternalLookup from "./ExternalLookup";
import { useEscape } from "@/lib/useEscape";

type Tx = {
  date: string;
  type: string | null;
  surface: number | null;
  rooms: number | null;
  price: number;
  ppsqm: number | null;
};

type Tab = "evolution" | "ventes" | "quartier";

export default function StreetCard({
  street,
  onClose,
  onOpenIris,
}: {
  street: StreetProps & { code_iris?: string; nom_iris?: string };
  onClose: () => void;
  onOpenIris: () => void;
}) {
  const [tab, setTab] = useState<Tab>("evolution");
  const [allTransactions, setAllTransactions] = useState<TxFeature[] | null>(null);
  const [iris, setIris] = useState<IrisProps | null>(null);
  useEscape(true, onClose);

  // Lazy-load transactions + IRIS on mount (cached after first open)
  useEffect(() => {
    let cancelled = false;
    if (!allTransactions) {
      fetch(assetUrl("/data/saint-maur/transactions.geojson"))
        .then((r) => r.json())
        .then((data: { features: TxFeature[] }) => {
          if (!cancelled) setAllTransactions(data.features);
        });
    }
    if (street.code_iris && !iris) {
      fetch(assetUrl("/data/saint-maur/iris.geojson"))
        .then((r) => r.json())
        .then((data: { features: { properties: IrisProps }[] }) => {
          const match = data.features.find(
            (f) => f.properties.code_iris === street.code_iris,
          );
          if (!cancelled && match) setIris(match.properties);
        });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [street.code_iris]);

  // Filter transactions belonging to this street
  const streetTxs: Tx[] = useMemo(() => {
    if (!allTransactions) return [];
    return allTransactions
      .filter((f) => f.properties.adresse_nom_voie === street.street_name)
      .map((f) => ({
        date: f.properties.date_iso ?? "",
        type: f.properties.type_local,
        surface: f.properties.surface_reelle_bati,
        rooms: f.properties.nombre_pieces_principales,
        price: f.properties.valeur_fonciere,
        ppsqm: f.properties.price_per_sqm,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [allTransactions, street.street_name]);

  // Aggregate per year for charts
  const byYear = useMemo(() => {
    const groups: Record<number, { sales: number; sum: number; n: number; ppsqm_sum: number; ppsqm_n: number }> = {};
    for (const tx of streetTxs) {
      const y = Number(tx.date.slice(0, 4));
      if (!groups[y]) groups[y] = { sales: 0, sum: 0, n: 0, ppsqm_sum: 0, ppsqm_n: 0 };
      groups[y].sales += 1;
      groups[y].sum += tx.price;
      groups[y].n += 1;
      if (tx.ppsqm) {
        groups[y].ppsqm_sum += tx.ppsqm;
        groups[y].ppsqm_n += 1;
      }
    }
    return Object.entries(groups)
      .map(([y, g]) => ({
        year: Number(y),
        sales: g.sales,
        avg_price: g.sum / g.n,
        avg_ppsqm: g.ppsqm_n > 0 ? g.ppsqm_sum / g.ppsqm_n : null,
      }))
      .sort((a, b) => a.year - b.year);
  }, [streetTxs]);

  const apptShare = Math.round((street.sales_appt / street.sales) * 100);

  function exportCSV() {
    const head = ["date", "type", "surface_m2", "pieces", "prix_eur", "prix_m2"];
    const rows = streetTxs.map((t) => [
      t.date,
      t.type ?? "",
      t.surface ?? "",
      t.rooms ?? "",
      Math.round(t.price),
      t.ppsqm ? Math.round(t.ppsqm) : "",
    ]);
    const csv = [head, ...rows]
      .map((r) => r.map((c) => String(c).replaceAll('"', '""')).map((c) => `"${c}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dvf_${street.street_name.toLowerCase().replaceAll(" ", "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <aside className="absolute top-0 right-0 bottom-0 z-20 w-full sm:w-[460px] bg-white border-l border-[color:var(--line)] shadow-[0_0_32px_rgba(0,0,0,0.08)] overflow-y-auto flex flex-col">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-[color:var(--line-soft)] px-5 py-4 z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-[0.15em] text-brand-strong mb-1">
              Rang #{street.turnover_rank} · {street.sales} ventes (5 ans)
            </div>
            <h2 className="text-xl font-semibold text-ink leading-tight">
              {formatStreet(street.street_name)}
            </h2>
            {street.nom_iris && (
              <button
                type="button"
                onClick={onOpenIris}
                className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-ink-soft hover:text-brand-strong transition"
              >
                <MapPin size={11} className="text-brand-strong" />
                Quartier {street.nom_iris}
              </button>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <ExternalLookup source="maps" query={street.street_name} />
              <ExternalLookup source="pagesblanches" query={street.street_name} />
              <ExternalLookup source="pagesjaunes" query={street.street_name} />
              <ExternalLookup source="pappers" query={street.street_name} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-2 text-ink-soft hover:text-ink hover:bg-surface-warm min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      <div className="p-5 space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-2">
          <KPI label="Ventes" value={formatNum(street.sales)} accent />
          <KPI label="Score d'activité" value={`${street.turnover_score}/100`} />
          <KPI label="Prix médian" value={formatEur(street.median_price)} />
          <KPI label="Prix m² médian" value={formatEurPerSqm(street.median_price_per_sqm)} />
        </div>

        {/* Type breakdown */}
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-ink-mute mb-1.5">
            Type de biens vendus
          </div>
          <div className="h-2.5 rounded-full bg-[color:var(--line-soft)] overflow-hidden flex">
            <div className="bg-brand h-full" style={{ width: `${apptShare}%` }} />
            <div className="bg-[color:var(--sage)] h-full" style={{ width: `${100 - apptShare}%` }} />
          </div>
          <div className="flex items-center justify-between text-xs text-ink-soft mt-2">
            <span className="inline-flex items-center gap-1.5">
              <Building2 size={13} className="text-brand-strong" />
              {street.sales_appt} appart. ({apptShare} %)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Home size={13} className="text-[color:var(--sage)]" />
              {street.sales_maison} maison{street.sales_maison > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5 border-b border-[color:var(--line)]">
        <div role="tablist" className="flex gap-1">
          <TabBtn active={tab === "evolution"} onClick={() => setTab("evolution")}>
            Évolution
          </TabBtn>
          <TabBtn active={tab === "ventes"} onClick={() => setTab("ventes")}>
            Ventes ({streetTxs.length})
          </TabBtn>
          <TabBtn active={tab === "quartier"} onClick={() => setTab("quartier")}>
            Quartier
          </TabBtn>
        </div>
      </div>

      <div className="flex-1 p-5">
        {tab === "evolution" && (
          <EvolutionTab byYear={byYear} street={street} />
        )}
        {tab === "ventes" && (
          <VentesTab txs={streetTxs} onExport={exportCSV} />
        )}
        {tab === "quartier" && (
          <QuartierTab iris={iris} onOpenIris={onOpenIris} />
        )}
      </div>
    </aside>
  );
}

/* ────────────────────────── helper components ────────────────────────── */

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`px-3 py-2.5 text-[13px] font-medium border-b-2 transition ${
        active
          ? "border-brand-strong text-ink"
          : "border-transparent text-ink-soft hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function KPI({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-lg px-3 py-2.5 border ${
        accent
          ? "bg-[color:var(--brand-soft)]/25 border-[color:var(--brand-soft)]"
          : "bg-surface-warm border-[color:var(--line)]"
      }`}
    >
      <div className="text-[10px] uppercase tracking-[0.15em] text-ink-mute mb-0.5">
        {label}
      </div>
      <div className={`tabular text-base font-semibold ${accent ? "text-brand-strong" : "text-ink"}`}>
        {value}
      </div>
    </div>
  );
}

function EvolutionTab({
  byYear,
  street,
}: {
  byYear: { year: number; sales: number; avg_price: number; avg_ppsqm: number | null }[];
  street: StreetProps;
}) {
  if (byYear.length === 0) {
    return <div className="text-sm text-ink-mute">Chargement de l&apos;historique…</div>;
  }
  const maxSales = Math.max(...byYear.map((y) => y.sales));
  const prices = byYear.map((y) => y.avg_price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const deltaPct =
    byYear.length > 1
      ? ((byYear[byYear.length - 1].avg_price - byYear[0].avg_price) / byYear[0].avg_price) * 100
      : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <div className="text-[11px] uppercase tracking-[0.12em] text-ink-mute">
          Évolution {byYear[0].year}–{byYear[byYear.length - 1].year}
        </div>
        <div
          className={`text-sm font-semibold tabular ${
            deltaPct >= 0 ? "text-[color:var(--sage)]" : "text-terracotta"
          }`}
        >
          {deltaPct >= 0 ? "+" : ""}{deltaPct.toFixed(1)} % prix moyen
        </div>
      </div>

      {/* Bar chart : ventes par année */}
      <section>
        <div className="text-[11px] text-ink-soft mb-2">Volume de ventes par année</div>
        <div className="flex items-end gap-1.5 h-24">
          {byYear.map((y) => {
            const h = Math.max(6, Math.round((y.sales / maxSales) * 88));
            return (
              <div key={y.year} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-brand rounded-t-sm hover:bg-brand-strong transition cursor-help"
                  style={{ height: `${h}px` }}
                  title={`${y.year} : ${y.sales} ventes · prix moyen ${formatEur(y.avg_price)}`}
                />
                <div className="text-[10px] tabular text-ink-mute mt-1">{y.year}</div>
                <div className="text-[10px] tabular text-ink font-medium">{y.sales}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Line chart : prix moyen par année */}
      <section>
        <div className="text-[11px] text-ink-soft mb-2">Prix de vente moyen par année</div>
        <Sparkline points={byYear.map((y) => y.avg_price)} years={byYear.map((y) => y.year)} />
        <div className="flex items-center justify-between text-[11px] text-ink-mute mt-1">
          <span>{formatEur(minP)} (min)</span>
          <span>{formatEur(maxP)} (max)</span>
        </div>
      </section>

      {/* Sub-stats */}
      <section className="border-t border-[color:var(--line-soft)] pt-4 text-[13px] text-ink-soft">
        <p className="leading-relaxed">
          Cette rue est <strong className="text-ink">classée #{street.turnover_rank}</strong>{" "}
          sur les 440 rues actives de Saint-Maur, avec un score d&apos;activité de{" "}
          <strong className="text-ink">{street.turnover_score}/100</strong>. Activité observée
          de {street.first_year} à {street.last_year}.
        </p>
      </section>
    </div>
  );
}

function VentesTab({ txs, onExport }: { txs: Tx[]; onExport: () => void }) {
  if (txs.length === 0) {
    return <div className="text-sm text-ink-mute">Chargement de la liste…</div>;
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.12em] text-ink-mute">
          {txs.length} transactions
        </div>
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[color:var(--line)] text-[12px] text-ink-soft hover:text-ink hover:bg-surface-warm transition"
        >
          <Download size={12} /> Exporter CSV
        </button>
      </div>

      <div className="border border-[color:var(--line)] rounded-lg overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="text-ink-mute text-[10px] uppercase tracking-wider bg-surface-warm">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Date</th>
              <th className="text-left px-3 py-2 font-medium">Type</th>
              <th className="text-right px-3 py-2 font-medium">m²</th>
              <th className="text-right px-3 py-2 font-medium">Prix</th>
              <th className="text-right px-3 py-2 font-medium">€/m²</th>
            </tr>
          </thead>
          <tbody>
            {txs.map((t, i) => (
              <tr
                key={`${t.date}-${i}`}
                className="border-t border-[color:var(--line-soft)] hover:bg-surface-warm/40 transition"
              >
                <td className="px-3 py-2 tabular text-ink-soft">
                  {t.date ? new Date(t.date).toLocaleDateString("fr-FR") : "-"}
                </td>
                <td className="px-3 py-2 text-ink-soft truncate max-w-[100px]">
                  {(t.type ?? "-").replace("Local industriel. commercial ou assimilé", "Commercial")}
                </td>
                <td className="px-3 py-2 text-right tabular">{t.surface ?? "-"}</td>
                <td className="px-3 py-2 text-right tabular font-medium text-ink">
                  {formatEur(t.price)}
                </td>
                <td className="px-3 py-2 text-right tabular text-ink-soft">
                  {t.ppsqm ? formatEurPerSqm(t.ppsqm) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-ink-mute">
        Source : DVF (DGFiP), données 2021-2025. Chaque ligne représente une transaction
        (un lot vendu). Les locaux commerciaux et dépendances sont inclus.
      </p>
    </div>
  );
}

function QuartierTab({ iris, onOpenIris }: { iris: IrisProps | null; onOpenIris: () => void }) {
  if (!iris) {
    return <div className="text-sm text-ink-mute">Chargement du profil du quartier…</div>;
  }
  return (
    <div className="space-y-4">
      <div>
        <div className="text-[11px] uppercase tracking-[0.12em] text-ink-mute mb-0.5">
          Quartier IRIS
        </div>
        <div className="text-base font-semibold text-ink">{iris.nom_iris}</div>
        <div className="text-[12px] text-ink-mute">Code {iris.code_iris} · INSEE 2021</div>
      </div>

      <Row
        icon={<Users size={14} />}
        label="Population"
        value={iris.population ? `${iris.population.toLocaleString("fr-FR")} hab.` : "-"}
        detail={`${iris.pct_0_14 ?? "-"} % de 0-14 ans · ${iris.pct_65p ?? "-"} % de 65 ans+`}
      />

      <Row
        icon={<Briefcase size={14} />}
        label="Profil socio-pro"
        value={iris.pct_cadres != null ? `${iris.pct_cadres} % cadres` : "-"}
        detail={
          iris.pct_bac5p != null
            ? `${iris.pct_bac5p} % de Bac+5 et plus`
            : ""
        }
      />

      <Row
        icon={<Home size={14} />}
        label="Logement"
        value={
          iris.n_log
            ? `${iris.n_log.toLocaleString("fr-FR")} logements`
            : "-"
        }
        detail={`${iris.pct_proprio ?? "-"} % propriétaires · ${iris.pct_hlm ?? "-"} % HLM`}
      />

      <Row
        icon={<TrendingUp size={14} />}
        label="Marché du quartier (5 ans)"
        value={`${iris.dvf_sales_total ?? 0} ventes`}
        detail={
          iris.dvf_median_ppsqm
            ? `${formatEurPerSqm(iris.dvf_median_ppsqm)} médian · ${formatEur(iris.dvf_median_price)} médian`
            : "-"
        }
      />

      <button
        type="button"
        onClick={onOpenIris}
        className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-ink text-white text-[14px] hover:bg-ink/85 transition min-h-[44px]"
      >
        Voir la fiche complète du quartier
      </button>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-7 w-7 shrink-0 rounded-full bg-[color:var(--brand-soft)]/30 text-brand-strong flex items-center justify-center">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-[0.12em] text-ink-mute">{label}</div>
        <div className="text-[14px] text-ink font-medium tabular">{value}</div>
        {detail && <div className="text-[12px] text-ink-soft mt-0.5">{detail}</div>}
      </div>
    </div>
  );
}

/* ────────────────────────── tiny SVG sparkline ────────────────────────── */

function Sparkline({ points, years }: { points: number[]; years: number[] }) {
  const w = 380;
  const h = 64;
  const pad = 6;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const coords = points.map((v, i) => {
    const x = pad + (innerW * i) / (points.length - 1);
    const y = pad + innerH - ((v - min) / range) * innerH;
    return [x, y] as const;
  });
  const line = coords.map((p, i) => (i ? "L" : "M") + p[0] + " " + p[1]).join(" ");
  const area = `M ${coords[0][0]} ${h - pad} ${coords.map((p) => `L ${p[0]} ${p[1]}`).join(" ")} L ${coords[coords.length - 1][0]} ${h - pad} Z`;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="block">
      <path d={area} fill="var(--brand-soft)" fillOpacity={0.4} />
      <path d={line} fill="none" stroke="var(--brand-strong)" strokeWidth={1.8} />
      {coords.map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r={2.5} fill="var(--brand-strong)" />
          <text
            x={p[0]}
            y={h - 2}
            fontSize={9}
            textAnchor="middle"
            fill="var(--ink-mute)"
            fontFamily="var(--font-poppins),sans-serif"
          >
            {years[i]}
          </text>
        </g>
      ))}
    </svg>
  );
}

interface TxFeature {
  properties: {
    date_iso?: string;
    type_local: string | null;
    surface_reelle_bati: number | null;
    nombre_pieces_principales: number | null;
    adresse_nom_voie: string;
    valeur_fonciere: number;
    price_per_sqm: number | null;
  };
}
