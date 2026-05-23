import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import ProductsSection from "@/components/landing/ProductsSection";
import AgencesSection from "@/components/landing/AgencesSection";
import TauxSection from "@/components/landing/TauxSection";
import RecrutementSection from "@/components/landing/RecrutementSection";
import PartnersSection from "@/components/landing/PartnersSection";
import CertifsStrip from "@/components/landing/CertifsStrip";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <ProductsSection />
        <AgencesSection />
        <TauxSection />
        <RecrutementSection />
        <PartnersSection />
        <CertifsStrip />
      </main>
      <Footer />
    </>
  );
}
