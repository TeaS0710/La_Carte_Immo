import fs from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/landing/Header";
import CarteBreadcrumb from "@/components/carte/CarteBreadcrumb";
import DeptCarteClient from "./DeptCarteClient";

interface CommuneSummary {
  code_insee: string;
  slug: string;
  nom: string;
  population: number;
  total_sales: number;
  median_price?: number | null;
  median_price_per_sqm?: number | null;
  streets_with_sales?: number;
}

interface DeptPayload {
  code_dept: string;
  nom_dept: string;
  communes_count_total: number;
  communes_count_available: number;
  total_sales: number;
  median_price?: number | null;
  median_price_per_sqm?: number | null;
  population_total: number;
  population_available: number;
  insights?: string[];
  top_communes: CommuneSummary[];
  all_communes_available: CommuneSummary[];
}

const DEPT_DIR = path.join(process.cwd(), "public", "data", "dept");

async function listAvailableDepts(): Promise<string[]> {
  try {
    const files = await fs.readdir(DEPT_DIR);
    return files.filter((f) => f.endsWith(".json")).map((f) => f.replace(".json", ""));
  } catch {
    return [];
  }
}

async function loadDept(code: string): Promise<DeptPayload | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(DEPT_DIR, `${code}.json`), "utf-8"));
  } catch {
    return null;
  }
}

export async function generateStaticParams() {
  const depts = await listAvailableDepts();
  return depts.map((code) => ({ code }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const dept = await loadDept(code);
  return {
    title: dept ? `La Carte Prelys · ${dept.nom_dept}` : "La Carte Prelys",
    description: dept
      ? `Marché immobilier ${dept.nom_dept} (${code}) — ${dept.communes_count_available} communes analysées.`
      : "Vue départementale.",
  };
}

export default async function DeptPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const dept = await loadDept(code);
  if (!dept) notFound();

  const fmt = (n: number) => n.toLocaleString("fr-FR");
  const fmtEur = (n?: number | null) =>
    n == null ? "—" : `${Math.round(n).toLocaleString("fr-FR")} €`;
  const pctCovered = dept.communes_count_total > 0
    ? Math.round((dept.communes_count_available / dept.communes_count_total) * 100)
    : 0;

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-5 py-10 space-y-8">
        <CarteBreadcrumb
          items={[
            { label: "Île-de-France", href: "/carte/region/idf" },
            { label: dept.nom_dept },
          ]}
        />

        <header>
          <div className="text-[11px] uppercase tracking-[0.15em] text-brand-strong mb-1">
            Département {dept.code_dept}
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold text-ink mb-3">
            {dept.nom_dept}
          </h1>
          <p className="text-ink-soft text-[15px] leading-relaxed max-w-2xl">
            {fmt(dept.communes_count_total)} communes ·{" "}
            {fmt(dept.population_total)} habitants. Analyse des transactions
            DVF (DGFiP 2021-2025).
          </p>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPIBox label="Communes couvertes" value={`${dept.communes_count_available} / ${dept.communes_count_total}`} sub={`${pctCovered} %`} accent />
          <KPIBox label="Ventes DVF" value={fmt(dept.total_sales)} sub="2021-2025" />
          <KPIBox label="Population couverte" value={fmt(dept.population_available)} sub={`/ ${fmt(dept.population_total)}`} />
          <KPIBox label="Prix médian dept" value={fmtEur(dept.median_price)} sub="médiane communale" />
        </section>

        {/* Top insights du département */}
        {dept.insights && dept.insights.length > 0 && (
          <section>
            <h2 className="text-[12px] uppercase tracking-[0.15em] text-ink-soft mb-3">
              Points-clés
            </h2>
            <ul className="space-y-2">
              {dept.insights.map((insight, i) => (
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

        {/* Carte interactive du département */}
        <section>
          <h2 className="text-[12px] uppercase tracking-[0.15em] text-ink-soft mb-3">
            Carte du département
          </h2>
          <DeptCarteClient
            code={code}
            nom={dept.nom_dept}
            availableSlugsCount={dept.communes_count_available}
          />
          <p className="text-[11px] text-ink-mute mt-2 leading-relaxed">
            Cliquer sur une commune pour ouvrir sa carte détaillée. Taille des
            cercles = volume de ventes DVF (5 ans). Couleur = prix au m² médian.
          </p>
        </section>

        <section>
          <h2 className="text-[12px] uppercase tracking-[0.15em] text-ink-soft mb-3">
            Communes analysées
          </h2>
          <div className="border border-[color:var(--line)] rounded-xl overflow-hidden bg-white">
            <table className="w-full text-[14px]">
              <thead className="bg-surface-warm text-[11px] uppercase tracking-[0.1em] text-ink-soft">
                <tr>
                  <th className="text-left px-4 py-2.5">Commune</th>
                  <th className="text-right px-4 py-2.5">Population</th>
                  <th className="text-right px-4 py-2.5">Ventes DVF</th>
                  <th className="text-right px-4 py-2.5">Prix médian</th>
                  <th className="text-right px-4 py-2.5">€/m²</th>
                  <th className="text-right px-4 py-2.5">&nbsp;</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--line-soft)]">
                {dept.top_communes.map((c) => (
                  <tr key={c.code_insee}>
                    <td className="px-4 py-2.5 text-ink font-medium">{c.nom}</td>
                    <td className="px-4 py-2.5 text-right tabular text-ink-soft">{fmt(c.population)}</td>
                    <td className="px-4 py-2.5 text-right tabular text-ink">{fmt(c.total_sales)}</td>
                    <td className="px-4 py-2.5 text-right tabular text-ink-soft">{fmtEur(c.median_price)}</td>
                    <td className="px-4 py-2.5 text-right tabular text-ink-soft">{fmtEur(c.median_price_per_sqm)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        href={`/carte/ville/${c.slug}/`}
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
          {dept.communes_count_total > dept.communes_count_available && (
            <p className="text-[11px] text-ink-mute mt-3 leading-relaxed">
              {dept.communes_count_total - dept.communes_count_available}{" "}
              communes du département en cours de traitement (DVF non encore
              téléchargé). Couverture progressive — relance{" "}
              <code className="text-ink">build_commune.py --batch</code> après
              fin du téléchargement.
            </p>
          )}
        </section>
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
