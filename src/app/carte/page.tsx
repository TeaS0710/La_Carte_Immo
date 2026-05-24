import Header from "@/components/landing/Header";
import RegionCarteClient from "./RegionCarteClient";

export const metadata = {
  title: "La Carte · Île-de-France",
  description:
    "La Carte Prelys : analyse interactive du marché immobilier de l'Île-de-France. Cliquez une commune pour ouvrir sa carte détaillée (DVF, INSEE, DPE, Géorisques, pipeline ventes probables).",
};

export default function CartePage() {
  return (
    <>
      <Header />
      <RegionCarteClient />
    </>
  );
}
