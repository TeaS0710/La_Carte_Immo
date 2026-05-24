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
  return {
    title: c ? `La Carte Prelys · ${c.nom}` : "La Carte Prelys",
    description: c
      ? `Analyse interactive du marché immobilier de ${c.nom} (${c.code_postal}) — transactions DVF, profil INSEE, pipeline de ventes probables.`
      : "Carte Prelys",
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

  return (
    <>
      <Header />
      <CarteClient stats={stats} commune={commune} availableSlugs={availableSlugs} />
    </>
  );
}
