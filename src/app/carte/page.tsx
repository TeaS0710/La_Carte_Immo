import fs from "node:fs/promises";
import path from "node:path";
import Header from "@/components/landing/Header";
import CarteClient from "./CarteClient";
import type { CommuneStats } from "@/lib/types";

export const metadata = {
  title: "La Carte Prelys · Saint-Maur",
  description:
    "La Carte Prelys : outil interactif d'analyse du marché immobilier de Saint-Maur-des-Fossés à destination des agences immobilières partenaires.",
};

async function loadStats(): Promise<CommuneStats> {
  const file = path.join(process.cwd(), "public", "data", "saint-maur", "stats.json");
  return JSON.parse(await fs.readFile(file, "utf-8"));
}

export default async function CartePage() {
  const stats = await loadStats();
  return (
    <>
      <Header />
      <CarteClient stats={stats} />
    </>
  );
}
