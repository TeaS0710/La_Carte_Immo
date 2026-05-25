import fs from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import Header from "@/components/landing/Header";
import CarteClient from "../../CarteClient";
import type { CommuneStats } from "@/lib/types";
import type { CommuneRef } from "@/lib/commune";

/**
 * Route dynamique par ville : /carte/ville/{slug}
 *
 * generateStaticParams énumère les communes qui ont des data générées
 * sous public/data/commune/{insee}/. À chaque nouvelle commune traitée
 * par `scripts/build_commune.py --code-insee XXX`, son slug devient
 * automatiquement disponible au prochain build.
 *
 * Pour le moment : Saint-Maur (94068) uniquement. À mesure que Phase 3
 * tourne, d'autres communes IDF apparaissent ici.
 */

const PUBLIC_DATA = path.join(process.cwd(), "public", "data");
const COMMUNES_MANIFEST = path.join(PUBLIC_DATA, "idf", "communes.json");

async function getAvailableCommunes(): Promise<CommuneRef[]> {
  try {
    const manifest = JSON.parse(await fs.readFile(COMMUNES_MANIFEST, "utf-8")) as CommuneRef[];
    const communeDir = path.join(PUBLIC_DATA, "commune");
    const entries = await fs.readdir(communeDir, { withFileTypes: true });
    const haveData = new Set(entries.filter((e) => e.isDirectory()).map((e) => e.name));
    return manifest.filter((c) => haveData.has(c.code_insee));
  } catch {
    return [];
  }
}

export async function generateStaticParams() {
  const communes = await getAvailableCommunes();
  return communes.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const communes = await getAvailableCommunes();
  const c = communes.find((x) => x.slug === slug);
  if (!c) {
    return { title: "La Carte Prelys", description: "Carte Prelys" };
  }
  // Enrichit la description avec les vrais chiffres du marché si on a stats.json
  const stats = await loadStats(c.code_insee);
  const priceLine = stats?.median_price_per_sqm
    ? ` · prix médian ${Math.round(stats.median_price_per_sqm).toLocaleString("fr-FR")} €/m²`
    : "";
  const salesLine = stats?.total_sales ? ` · ${stats.total_sales.toLocaleString("fr-FR")} ventes DVF 2021-2025` : "";
  const description = `Carte interactive du marché immobilier de ${c.nom} (${c.code_postal})${priceLine}${salesLine}. Données INSEE 2020, DGFiP DVF, BPE 2024, ADEME DPE — pour agents immobiliers partenaires de Prelys Courtage.`;
  return {
    title: `${c.nom} · marché immobilier IRIS — La Carte Prelys`,
    description,
    openGraph: {
      title: `${c.nom} · La Carte Prelys`,
      description,
      type: "website",
      locale: "fr_FR",
    },
    twitter: {
      card: "summary_large_image",
      title: `${c.nom} · La Carte Prelys`,
      description,
    },
    alternates: {
      canonical: `/carte/ville/${slug}`,
    },
  };
}

async function loadStats(codeInsee: string): Promise<CommuneStats | null> {
  try {
    const file = path.join(PUBLIC_DATA, "commune", codeInsee, "stats.json");
    return JSON.parse(await fs.readFile(file, "utf-8"));
  } catch {
    return null;
  }
}

async function probeAvailableData(codeInsee: string): Promise<{
  hasIris: boolean;
  hasPipeline: boolean;
  hasAnalyses: boolean;
  hasPermits: boolean;
}> {
  const dir = path.join(PUBLIC_DATA, "commune", codeInsee);
  async function exists(file: string): Promise<boolean> {
    try {
      const st = await fs.stat(path.join(dir, file));
      return st.size > 100;
    } catch {
      return false;
    }
  }
  return {
    hasIris: await exists("iris.geojson"),
    hasPipeline: await exists("pipeline.geojson"),
    hasAnalyses: await exists("iris_analyses.json"),
    hasPermits: await exists("permits.geojson"),
  };
}

export default async function VillePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const communes = await getAvailableCommunes();
  const commune = communes.find((c) => c.slug === slug);
  if (!commune) notFound();

  const stats = await loadStats(commune.code_insee);
  if (!stats) notFound();

  const availableSlugs = communes.map((c) => c.slug);
  const dataState = await probeAvailableData(commune.code_insee);

  return (
    <>
      <Header />
      <CarteClient
        stats={stats}
        commune={commune}
        availableSlugs={availableSlugs}
        dataState={dataState}
      />
    </>
  );
}
