import fs from "node:fs/promises";
import path from "node:path";
import Header from "@/components/landing/Header";
import ComparateurClient from "./ComparateurClient";

export const metadata = {
  title: "Comparateur de communes · La Carte Prelys",
  description:
    "Comparez côte à côte plusieurs communes d'Île-de-France : prix médian, profil socio-pro, équipements BPE, dynamique des ventes. Pour cibler les villes où prospecter en mandat.",
};

interface CommuneRef {
  code_insee: string;
  slug: string;
  nom: string;
  code_dept: string;
  population: number;
  total_sales?: number;
  median_price_per_sqm?: number;
}

async function loadFullCommunes(): Promise<CommuneRef[]> {
  try {
    const raw = await fs.readFile(
      path.join(process.cwd(), "public", "data", "idf", "communes_full_choro.geojson"),
      "utf-8",
    );
    const fc = JSON.parse(raw) as { features: { properties: CommuneRef }[] };
    return fc.features
      .map((f) => f.properties)
      .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  } catch {
    return [];
  }
}

export default async function ComparateurPage() {
  const communes = await loadFullCommunes();
  return (
    <>
      <Header />
      <main className="min-h-screen bg-surface-warm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="mb-8">
            <div className="text-[11px] uppercase tracking-[0.15em] text-brand-strong mb-1">
              Comparateur de villes
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold text-ink mb-2 leading-tight">
              Quelle commune cibler en prospection ?
            </h1>
            <p className="text-[14px] text-ink-soft max-w-2xl leading-relaxed">
              Sélectionnez 2 à 4 communes pour comparer leur profil acheteur,
              leur dynamique de marché et leur tissu d&apos;équipements. Toutes
              les données viennent des sources INSEE 2020, DGFiP DVF 2021–2025,
              BPE 2024 et ADEME DPE.
            </p>
          </div>
          <ComparateurClient communes={communes} />
        </div>
      </main>
    </>
  );
}
