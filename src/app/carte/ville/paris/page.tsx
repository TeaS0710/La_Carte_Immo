import fs from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import Header from "@/components/landing/Header";
import CarteBreadcrumb from "@/components/carte/CarteBreadcrumb";
import { assetUrl } from "@/lib/url";

/**
 * Page hub Paris : Paris est traitée comme une "super-ville" qui
 * regroupe ses 20 arrondissements. Chaque arrondissement est ensuite
 * une commune normale avec ses propres data (DVF, IRIS, etc.).
 */

interface CommuneRef {
  code_insee: string;
  slug: string;
  nom: string;
  population?: number;
  lng?: number;
  lat?: number;
}

const MANIFEST = path.join(process.cwd(), "public", "data", "idf", "communes.json");
const COMMUNE_DIR = path.join(process.cwd(), "public", "data", "commune");

async function listArrondissements(): Promise<{ arr: CommuneRef; hasData: boolean }[]> {
  try {
    const manifest = JSON.parse(await fs.readFile(MANIFEST, "utf-8")) as CommuneRef[];
    const arrs = manifest
      .filter((c) => c.code_insee.startsWith("751") && c.code_insee.length === 5)
      .sort((a, b) => a.code_insee.localeCompare(b.code_insee));
    const haveData = new Set(
      (await fs.readdir(COMMUNE_DIR, { withFileTypes: true }))
        .filter((e) => e.isDirectory())
        .map((e) => e.name),
    );
    return arrs.map((arr) => ({ arr, hasData: haveData.has(arr.code_insee) }));
  } catch {
    return [];
  }
}

export const metadata = {
  title: "La Carte Prelys · Paris",
  description: "Vue d'ensemble du marché immobilier parisien — accès aux 20 arrondissements.",
};

export default async function ParisHubPage() {
  const arrs = await listArrondissements();
  const totalPop = arrs.reduce((s, { arr }) => s + (arr.population ?? 0), 0);
  const availableCount = arrs.filter((a) => a.hasData).length;
  const fmt = (n: number) => n.toLocaleString("fr-FR");

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-5 py-10 space-y-8">
        <CarteBreadcrumb
          items={[
            { label: "Île-de-France", href: assetUrl("/carte/region/idf") },
            { label: "Paris", href: assetUrl("/carte/dept/75") },
            { label: "Vue d'ensemble" },
          ]}
        />

        <header>
          <div className="text-[11px] uppercase tracking-[0.15em] text-brand-strong mb-1">
            Super-ville
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold text-ink mb-3">
            Paris
          </h1>
          <p className="text-ink-soft text-[15px] leading-relaxed max-w-2xl">
            Paris est traitée comme une super-ville composée de ses 20 arrondissements.
            Le marché immobilier est analysé séparément pour chacun, avec ses propres
            transactions DVF, profil INSEE et indicateurs Géorisques. Cliquez un
            arrondissement pour ouvrir sa carte détaillée.
          </p>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPIBox label="Arrondissements" value="20" sub={`${availableCount} couverts`} accent />
          <KPIBox label="Population" value={fmt(totalPop)} sub="INSEE 2021" />
          <KPIBox label="Code INSEE commune" value="75056" sub="(global)" />
          <KPIBox label="Code département" value="75" sub="Paris" />
        </section>

        <section>
          <h2 className="text-[12px] uppercase tracking-[0.15em] text-ink-soft mb-3">
            Les 20 arrondissements
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {arrs.map(({ arr, hasData }) => {
              // Extraire numéro arrondissement de "Paris 1er Arrondissement"
              const num = arr.code_insee.slice(3);
              const numLabel = num === "01" ? "1er" : `${parseInt(num)}e`;
              return hasData ? (
                <Link
                  key={arr.code_insee}
                  href={assetUrl(`/carte/ville/${arr.slug}`)}
                  className="block rounded-xl border border-[color:var(--line)] bg-white p-4 hover:border-brand hover:bg-surface-warm/50 transition group focus:outline-none focus:ring-2 focus:ring-brand-strong/30"
                >
                  <div className="text-[10px] uppercase tracking-[0.12em] text-brand-strong mb-0.5">
                    {numLabel}
                  </div>
                  <div className="text-[14px] font-semibold text-ink leading-tight group-hover:text-brand-strong">
                    {arr.nom}
                  </div>
                  <div className="text-[11px] text-ink-soft mt-1 tabular">
                    {arr.population ? `${fmt(arr.population)} hab.` : "—"}
                  </div>
                </Link>
              ) : (
                <div
                  key={arr.code_insee}
                  className="rounded-xl border border-[color:var(--line-soft)] bg-surface-warm/40 p-4 opacity-60 cursor-not-allowed"
                  aria-label={`${arr.nom} — données en cours de génération`}
                >
                  <div className="text-[10px] uppercase tracking-[0.12em] text-ink-mute mb-0.5">
                    {numLabel}
                  </div>
                  <div className="text-[14px] font-medium text-ink-soft leading-tight">
                    {arr.nom}
                  </div>
                  <div className="text-[11px] text-ink-mute italic mt-1">
                    Données en cours
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {availableCount === 0 && (
          <p className="text-[12px] text-ink-mute leading-relaxed">
            Le téléchargement des transactions DVF par arrondissement est en cours.
            Les fiches deviendront accessibles automatiquement à mesure que les
            données sont générées (rafraîchir la page).
          </p>
        )}

        <footer className="text-[11px] text-ink-mute leading-relaxed border-t border-[color:var(--line-soft)] pt-5">
          Sources : DGFiP DVF (transactions), INSEE Recensement 2021 (population),
          Géorisques (risques majeurs). Les analyses LLM par IRIS arrivent
          progressivement après la génération des données brutes.
        </footer>
      </main>
    </>
  );
}

function KPIBox({
  label, value, sub, accent,
}: {
  label: string; value: string; sub?: string; accent?: boolean;
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
