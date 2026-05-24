import fs from "node:fs/promises";
import path from "node:path";
import Header from "@/components/landing/Header";
import RegionCarteClient from "./RegionCarteClient";

export const metadata = {
  title: "La Carte · Île-de-France",
  description:
    "La Carte Prelys : analyse interactive du marché immobilier de l'Île-de-France. Cliquez une commune pour ouvrir sa carte détaillée (DVF, INSEE, DPE, Géorisques, pipeline ventes probables).",
};

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

export default async function CartePage() {
  const availableSlugs = await listAvailableSlugs();
  return (
    <>
      <Header />
      <RegionCarteClient availableSlugs={availableSlugs} />
    </>
  );
}
