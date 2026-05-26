"use client";

import { useEffect, useMemo, useState } from "react";
import { assetUrl } from "@/lib/url";

interface CommuneRef {
  code_insee: string;
  slug: string;
  nom: string;
  code_dept: string;
  population: number;
  total_sales?: number;
  median_price_per_sqm?: number;
}

interface CommuneAvg {
  pct_proprio: number | null;
  pct_hlm: number | null;
  pct_appart: number | null;
  pct_cadres: number | null;
  pct_bac5p: number | null;
  pct_etrangers: number | null;
  pct_0_14: number | null;
  pct_65p: number | null;
  dvf_median_price: number | null;
  dvf_median_ppsqm: number | null;
  dvf_sales_total: number;
  bpe_total: number;
  population: number;
  n_log: number;
}

interface CommuneStats {
  commune: string;
  insee: string;
  total_sales: number;
  median_price: number;
  median_price_per_sqm: number | null;
  sirene_agences_immo?: number;
  sirene_targets_total?: number;
}

interface Loaded {
  ref: CommuneRef;
  avg: CommuneAvg | null;
  stats: CommuneStats | null;
}

const MAX_SELECTED = 4;

const ROWS: { key: keyof CommuneAvg; label: string; fmt: (v: number) => string; hint?: string }[] = [
  { key: "population", label: "Population (INSEE 2020)", fmt: (v) => v.toLocaleString("fr-FR") },
  { key: "dvf_median_ppsqm", label: "Prix médian €/m²", fmt: (v) => `${Math.round(v).toLocaleString("fr-FR")} €` },
  { key: "dvf_median_price", label: "Prix médian (bien)", fmt: (v) => `${Math.round(v).toLocaleString("fr-FR")} €` },
  { key: "dvf_sales_total", label: "Ventes 2021–2025", fmt: (v) => v.toLocaleString("fr-FR") },
  { key: "pct_cadres", label: "% cadres (CSP3)", fmt: (v) => `${v.toFixed(1)} %` },
  { key: "pct_bac5p", label: "% Bac+5 et plus", fmt: (v) => `${v.toFixed(1)} %` },
  { key: "pct_proprio", label: "% propriétaires occupants", fmt: (v) => `${v.toFixed(1)} %` },
  { key: "pct_hlm", label: "% HLM", fmt: (v) => `${v.toFixed(1)} %` },
  { key: "pct_appart", label: "% appartements", fmt: (v) => `${v.toFixed(1)} %` },
  { key: "pct_0_14", label: "% moins de 14 ans", fmt: (v) => `${v.toFixed(1)} %`, hint: "Familles avec jeunes enfants" },
  { key: "pct_65p", label: "% 65 ans et +", fmt: (v) => `${v.toFixed(1)} %`, hint: "Cible succession / viager" },
  { key: "pct_etrangers", label: "% population étrangère", fmt: (v) => `${v.toFixed(1)} %` },
  { key: "bpe_total", label: "Équipements BPE 2024", fmt: (v) => v.toLocaleString("fr-FR") },
];

export default function ComparateurClient({ communes }: { communes: CommuneRef[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [loaded, setLoaded] = useState<Record<string, Loaded>>({});
  const [search, setSearch] = useState("");

  // Pre-select via URL hash (#selected=94042,94068) sinon fallback Saint-Maur + Joinville
  useEffect(() => {
    if (selected.length > 0 || communes.length === 0) return;
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const match = hash.match(/selected=([0-9,]+)/);
    const codes = (match?.[1] ?? "").split(",").filter(Boolean).slice(0, MAX_SELECTED);
    const valid = codes.filter((c) => communes.some((x) => x.code_insee === c));
    if (valid.length > 0) {
      // Toujours ajouter Saint-Maur (référence Prelys) si pas déjà dans la liste,
      // sauf si on est déjà au max.
      const stm = "94068";
      if (!valid.includes(stm) && valid.length < MAX_SELECTED && communes.some((c) => c.code_insee === stm)) {
        valid.push(stm);
      }
      setSelected(valid);
      return;
    }
    const stm = communes.find((c) => c.code_insee === "94068");
    const joi = communes.find((c) => c.code_insee === "94042");
    if (stm && joi) setSelected([stm.code_insee, joi.code_insee]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communes]);

  // Fetch commune.json + stats.json for newly-selected codes
  useEffect(() => {
    selected.forEach((code) => {
      if (loaded[code]) return;
      const ref = communes.find((c) => c.code_insee === code);
      if (!ref) return;
      Promise.all([
        fetch(assetUrl(`/data/commune/${code}/commune.json`)).then((r) => (r.ok ? r.json() : null)),
        fetch(assetUrl(`/data/commune/${code}/stats.json`)).then((r) => (r.ok ? r.json() : null)),
      ]).then(([avg, stats]) => {
        setLoaded((prev) => ({ ...prev, [code]: { ref, avg, stats } }));
      });
    });
  }, [selected, communes, loaded]);

  const filtered = useMemo(() => {
    if (!search) return communes;
    const s = search.toLowerCase();
    return communes.filter((c) => c.nom.toLowerCase().includes(s) || c.code_insee.includes(s));
  }, [communes, search]);

  function toggle(code: string) {
    setSelected((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code);
      if (prev.length >= MAX_SELECTED) return prev;
      return [...prev, code];
    });
  }

  // Compute min/max per metric across selected (for the bar visualization)
  const ranges = useMemo(() => {
    const out: Record<string, { min: number; max: number }> = {};
    ROWS.forEach((r) => {
      const vals = selected
        .map((c) => loaded[c]?.avg?.[r.key])
        .filter((v): v is number => typeof v === "number");
      if (vals.length) out[r.key] = { min: Math.min(...vals), max: Math.max(...vals) };
    });
    return out;
  }, [selected, loaded]);

  return (
    <div className="space-y-6">
      {/* ── Sélection ── */}
      <section className="rounded-2xl border border-[color:var(--line)] bg-white p-5">
        <div className="flex items-baseline justify-between gap-4 mb-3">
          <h2 className="text-[15px] font-semibold text-ink">
            Sélectionnez jusqu&apos;à {MAX_SELECTED} communes
          </h2>
          <span className="text-[12px] text-ink-mute">
            {selected.length} / {MAX_SELECTED} sélectionnées
          </span>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une commune…"
          className="w-full rounded-lg border border-[color:var(--line)] bg-surface-warm px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-brand"
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
          {filtered.map((c) => {
            const isSel = selected.includes(c.code_insee);
            const disabled = !isSel && selected.length >= MAX_SELECTED;
            return (
              <button
                key={c.code_insee}
                type="button"
                onClick={() => toggle(c.code_insee)}
                disabled={disabled}
                className={`text-left rounded-lg border px-2.5 py-1.5 text-[12.5px] leading-tight transition ${
                  isSel
                    ? "border-brand bg-brand/10 text-brand-strong font-medium"
                    : disabled
                      ? "border-[color:var(--line-soft)] bg-surface-warm text-ink-mute cursor-not-allowed opacity-60"
                      : "border-[color:var(--line)] bg-white text-ink hover:border-brand hover:bg-brand/5"
                }`}
              >
                <div className="truncate">{c.nom}</div>
                <div className="text-[10.5px] text-ink-mute tabular">
                  {c.population?.toLocaleString("fr-FR")} hab.
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Mobile : cards stackées (1 commune par card, scroll vertical) ── */}
      {selected.length > 0 && (
        <section className="md:hidden space-y-4">
          {selected.map((code) => {
            const l = loaded[code];
            return (
              <div key={code} className="rounded-2xl border border-[color:var(--line)] bg-white overflow-hidden">
                <header className="bg-surface-warm px-4 py-3 border-b border-[color:var(--line)] flex items-baseline justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold text-ink leading-tight truncate">
                      {l?.ref.nom ?? code}
                    </div>
                    <div className="text-[11px] text-ink-mute mt-0.5">
                      INSEE {code} · dépt {l?.ref.code_dept}
                    </div>
                  </div>
                  {l?.ref.slug && (
                    <a
                      href={`/carte/ville/${l.ref.slug}/`}
                     
                      className="text-[11.5px] text-brand-strong hover:underline shrink-0"
                    >
                      Ouvrir la carte ↗
                    </a>
                  )}
                </header>
                <div className="divide-y divide-[color:var(--line-soft)]">
                  {ROWS.map((row) => {
                    const range = ranges[row.key];
                    const v = l?.avg?.[row.key];
                    if (typeof v !== "number") {
                      return (
                        <div key={row.key} className="flex items-baseline justify-between gap-3 px-4 py-2.5">
                          <div className="text-[12px] text-ink-soft">{row.label}</div>
                          <div className="tabular text-[12px] text-ink-mute">{l ? "—" : "…"}</div>
                        </div>
                      );
                    }
                    const isTop = range && v === range.max && selected.length > 1;
                    const isBottom = range && v === range.min && selected.length > 1 && range.max !== range.min;
                    const pct = range && range.max > range.min ? ((v - range.min) / (range.max - range.min)) * 100 : 100;
                    return (
                      <div key={row.key} className="px-4 py-2.5">
                        <div className="flex items-baseline justify-between gap-3 mb-1">
                          <div className="text-[12px] text-ink-soft">
                            <span className="text-ink">{row.label}</span>
                          </div>
                          <div className={`tabular text-[14px] font-semibold ${isTop ? "text-brand-strong" : isBottom ? "text-terracotta" : "text-ink"}`}>
                            {row.fmt(v)}
                            {isTop && <span className="ml-1 text-[9px] uppercase tracking-wide text-brand-strong">top</span>}
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-[color:var(--line-soft)] overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isBottom ? "bg-terracotta/60" : "bg-brand"}`}
                            style={{ width: `${Math.max(4, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {/* Sirene */}
                  {l?.stats?.sirene_agences_immo != null && (
                    <div className="flex items-baseline justify-between gap-3 px-4 py-2.5 bg-surface-warm/60">
                      <div className="text-[12px]">
                        <div className="text-ink">Concurrence agences immo</div>
                        <div className="text-[10.5px] text-ink-mute">Sirene 68.31Z + 68.32</div>
                      </div>
                      <div className="tabular text-[14px] font-semibold text-ink">
                        {l.stats.sirene_agences_immo.toLocaleString("fr-FR")}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div className="text-[11px] text-ink-mute leading-relaxed">
            <strong className="text-brand-strong">Top</strong> = meilleur de la sélection ·{" "}
            <strong className="text-terracotta">moins bon</strong> = plus bas. Les barres normalisent
            la valeur entre le min et le max des communes sélectionnées.
          </div>
        </section>
      )}

      {/* ── Tableau comparatif (desktop/tablet large md+) ── */}
      {selected.length === 0 ? (
        <div className="rounded-2xl border border-[color:var(--line)] bg-surface-warm p-8 text-center text-[13px] text-ink-soft">
          Cochez 2 à 4 communes pour démarrer la comparaison.
        </div>
      ) : (
        <section className="hidden md:block rounded-2xl border border-[color:var(--line)] bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-surface-warm border-b border-[color:var(--line)]">
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-[0.12em] text-ink-mute font-medium w-[200px]">
                    Indicateur
                  </th>
                  {selected.map((code) => {
                    const l = loaded[code];
                    return (
                      <th key={code} className="text-left px-4 py-3 align-bottom min-w-[180px]">
                        <div className="text-[14px] font-semibold text-ink leading-tight">
                          {l?.ref.nom ?? code}
                        </div>
                        <div className="text-[11px] text-ink-mute mt-0.5">
                          INSEE {code} · dépt {l?.ref.code_dept}
                        </div>
                        {l?.ref.slug && (
                          <a
                            href={`/carte/ville/${l.ref.slug}/`}
                            className="text-[11px] text-brand-strong hover:underline mt-1 inline-block"
                          >
                            Ouvrir la carte ↗
                          </a>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, ri) => {
                  const range = ranges[row.key];
                  return (
                    <tr
                      key={row.key}
                      className={ri % 2 === 0 ? "bg-white" : "bg-surface-warm/40"}
                    >
                      <td className="px-4 py-2.5 text-ink-soft align-top">
                        <div className="font-medium text-ink">{row.label}</div>
                        {row.hint && (
                          <div className="text-[11px] text-ink-mute mt-0.5">{row.hint}</div>
                        )}
                      </td>
                      {selected.map((code) => {
                        const l = loaded[code];
                        const v = l?.avg?.[row.key];
                        if (typeof v !== "number") {
                          return (
                            <td key={code} className="px-4 py-2.5 text-ink-mute tabular">
                              {l ? "—" : "…"}
                            </td>
                          );
                        }
                        const isTop = range && v === range.max && selected.length > 1;
                        const isBottom = range && v === range.min && selected.length > 1 && range.max !== range.min;
                        const pct = range && range.max > range.min ? ((v - range.min) / (range.max - range.min)) * 100 : 100;
                        return (
                          <td key={code} className="px-4 py-2.5 align-top">
                            <div className="flex items-baseline gap-2 mb-1">
                              <div
                                className={`tabular font-semibold ${
                                  isTop ? "text-brand-strong" : isBottom ? "text-terracotta" : "text-ink"
                                }`}
                              >
                                {row.fmt(v)}
                              </div>
                              {isTop && selected.length > 1 && (
                                <span className="text-[10px] uppercase tracking-wide text-brand-strong">
                                  top
                                </span>
                              )}
                            </div>
                            <div className="h-1.5 rounded-full bg-[color:var(--line-soft)] overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isBottom ? "bg-terracotta/60" : "bg-brand"
                                }`}
                                style={{ width: `${Math.max(4, pct)}%` }}
                              />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {/* Sirene row */}
                <tr className="bg-white border-t-2 border-[color:var(--line)]">
                  <td className="px-4 py-2.5 align-top">
                    <div className="font-medium text-ink">Concurrence agences immo</div>
                    <div className="text-[11px] text-ink-mute mt-0.5">Sirene NAF 68.31Z + 68.32</div>
                  </td>
                  {selected.map((code) => {
                    const l = loaded[code];
                    const n = l?.stats?.sirene_agences_immo;
                    return (
                      <td key={code} className="px-4 py-2.5 align-top tabular">
                        <div className="font-semibold text-ink">
                          {typeof n === "number" ? n.toLocaleString("fr-FR") : l ? "—" : "…"}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 bg-surface-warm text-[11px] text-ink-mute leading-relaxed border-t border-[color:var(--line)]">
            <strong className="text-brand-strong">Top</strong> = meilleur de la
            sélection · <strong className="text-terracotta">moins bon</strong> = plus
            bas. Les barres normalisent la valeur entre le min et le max des communes
            sélectionnées (pour comparer la dispersion, pas la magnitude absolue).
          </div>
        </section>
      )}
    </div>
  );
}
