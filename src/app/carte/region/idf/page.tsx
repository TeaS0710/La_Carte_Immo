import fs from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import Header from "@/components/landing/Header";
import CommuneSearch from "@/components/carte/CommuneSearch";
import DataSourcesBanner from "@/components/carte/DataSourcesBanner";

interface DeptSummary {
  code_dept: string;
  nom_dept: string;
  communes_count_total: number;
  communes_count_available: number;
  total_sales: number;
}

interface CommuneSummary {
  code_insee: string;
  slug: string;
  nom: string;
  population: number;
  total_sales: number;
  median_price?: number | null;
  median_price_per_sqm?: number | null;
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
}

async function loadRegion(): Promise<RegionPayload | null> {
  const p = path.join(process.cwd(), "public", "data", "idf", "region.json");
  try {
    return JSON.parse(await fs.readFile(p, "utf-8"));
  } catch {
    return null;
  }
}

async function listAvailableSlugs(): Promise<string[]> {
  try {
    const manifest = JSON.parse(
      await fs.readFile(
        path.join(process.cwd(), "public", "data", "idf", "communes.json"),
        "utf-8",
      ),
    ) as { slug: string; code_insee: string }[];
    const dir = path.join(process.cwd(), "public", "data", "commune");
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const haveData = new Set(entries.filter((e) => e.isDirectory()).map((e) => e.name));
    return manifest.filter((c) => haveData.has(c.code_insee)).map((c) => c.slug);
  } catch {
    return [];
  }
}

export const metadata = {
  title: "La Carte Prelys · Île-de-France",
  description: "Vue d'ensemble du marché immobilier de l'Île-de-France à l'échelle régionale et départementale.",
};

export default async function RegionPage() {
  const region = await loadRegion();
  const availableSlugs = await listAvailableSlugs();
  if (!region) {
    return (
      <>
        <Header />
        <main className="max-w-4xl mx-auto px-6 py-12">
          <p>Données régionales non disponibles. Lance scripts/build_dept_aggregates.py.</p>
        </main>
      </>
    );
  }

  const fmt = (n: number) => n.toLocaleString("fr-FR");
  const fmtEur = (n?: number | null) =>
    n == null ? "—" : `${Math.round(n).toLocaleString("fr-FR")} €`;

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-5 py-10 space-y-10">
        <header>
          <div className="text-[11px] uppercase tracking-[0.15em] text-brand-strong mb-1">
            Région
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold text-ink mb-3">
            {region.nom_region}
          </h1>
          <p className="text-ink-soft text-[15px] leading-relaxed max-w-2xl">
            Synthèse du marché immobilier des {fmt(region.communes_count_total)}{" "}
            communes franciliennes ({fmt(region.population_total)} habitants).
            Données ouvertes DGFiP (transactions DVF 2021-2025).
          </p>
        </header>

        {/* Recherche commune autocomplete */}
        <section>
          <h2 className="text-[12px] uppercase tracking-[0.15em] text-ink-soft mb-3">
            Trouver une commune
          </h2>
          <CommuneSearch availableSlugs={availableSlugs} />
        </section>

        {/* Top insights régionaux */}
        {region.insights && region.insights.length > 0 && (
          <section>
            <h2 className="text-[12px] uppercase tracking-[0.15em] text-ink-soft mb-3">
              Points-clés
            </h2>
            <ul className="space-y-2">
              {region.insights.map((insight, i) => (
                <li
                  key={i}
                  className="rounded-lg border-l-2 border-l-brand-strong bg-surface-warm/40 px-4 py-2.5 text-[13.5px] text-ink leading-relaxed"
                >
                  {insight}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* KPI globaux */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPIBox label="Communes couvertes" value={`${fmt(region.communes_count_available)} / ${fmt(region.communes_count_total)}`} accent />
          <KPIBox label="Ventes DVF analysées" value={fmt(region.total_sales_available)} />
          <KPIBox label="Population totale" value={fmt(region.population_total)} sub="recensement INSEE 2020" />
          <KPIBox label="Départements" value={`${region.depts.length}`} sub="couverts" />
        </section>

        {/* Tableau départements */}
        <section>
          <h2 className="text-[12px] uppercase tracking-[0.15em] text-ink-soft mb-3">
            Départements
          </h2>
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
                      <td className="px-4 py-2.5 text-right tabular text-ink">
                        {fmt(d.total_sales)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {d.communes_count_available > 0 && (
                          <Link
                            href={`/carte/dept/${d.code_dept}`}
                            className="text-brand-strong hover:text-ink text-[13px]"
                          >
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
        </section>

        {/* Top communes */}
        <section>
          <h2 className="text-[12px] uppercase tracking-[0.15em] text-ink-soft mb-3">
            Top communes par volume de ventes
          </h2>
          <div className="border border-[color:var(--line)] rounded-xl overflow-hidden bg-white">
            <table className="w-full text-[14px]">
              <thead className="bg-surface-warm text-[11px] uppercase tracking-[0.1em] text-ink-soft">
                <tr>
                  <th className="text-left px-4 py-2.5">#</th>
                  <th className="text-left px-4 py-2.5">Commune</th>
                  <th className="text-right px-4 py-2.5">Population</th>
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
                    <td className="px-4 py-2.5 text-right tabular text-ink-soft">{fmt(c.population)}</td>
                    <td className="px-4 py-2.5 text-right tabular text-ink">{fmt(c.total_sales)}</td>
                    <td className="px-4 py-2.5 text-right tabular text-ink-soft">{fmtEur(c.median_price)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        href={`/carte/ville/${c.slug}`}
                        className="text-brand-strong hover:text-ink text-[13px]"
                      >
                        Carte →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <DataSourcesBanner
          communesCount={region.communes_count_available}
          ventesCount={region.total_sales_available}
        />

        <footer className="text-[11px] text-ink-mute leading-relaxed pt-3">
          Couverture progressive — les nouvelles communes sont ajoutées au fur
          et à mesure que leurs données DVF sont téléchargées et traitées.
        </footer>
      </main>
    </>
  );
}

function KPIBox({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`border rounded-xl p-4 ${
        accent
          ? "border-[color:var(--brand)] bg-[color:var(--brand-soft)]/30"
          : "border-[color:var(--line)] bg-white"
      }`}
    >
      <div className="text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-0.5">
        {label}
      </div>
      <div className="text-[20px] font-semibold text-ink tabular leading-tight">
        {value}
      </div>
      {sub && <div className="text-[11px] text-ink-mute mt-0.5">{sub}</div>}
    </div>
  );
}
