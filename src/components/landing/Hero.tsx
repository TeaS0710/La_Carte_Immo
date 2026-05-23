import Image from "next/image";
import { Phone } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative bg-[#212529] text-white">
      <div className="relative max-w-6xl mx-auto px-6 pt-16 md:pt-20 pb-20 md:pb-24 grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-center">
        <div>
          <div className="text-[12px] uppercase tracking-[0.18em] text-[color:var(--brand)] mb-5">
            Courtage en prêts depuis 2013
          </div>

          <h1 className="font-bold text-[2.4rem] md:text-[3.75rem] leading-[1.08] tracking-tight mb-6 text-balance">
            Facilitons l&apos;accès à vos crédits.
          </h1>

          <p className="text-lg text-white/75 leading-relaxed max-w-xl mb-10">
            Enseigne nationale de courtage en prêts immobiliers, prêts
            professionnels, regroupement de crédits et assurances
            emprunteurs.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="https://www.prelys-courtage.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 rounded bg-[color:var(--brand)] text-white font-medium text-[15px] hover:bg-[color:var(--brand-strong)] transition min-h-[48px]"
            >
              Démarrer une étude gratuite
            </a>
            <a
              href="https://www.prelys-courtage.com/trouver-votre-courtier/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 rounded border border-white/25 text-white hover:bg-white/10 transition min-h-[48px]"
            >
              Trouver votre courtier
            </a>
          </div>

          <div className="mt-10 pt-7 border-t border-white/10 text-[14px] text-white/65 flex items-center gap-2 flex-wrap">
            <Phone size={14} className="text-[color:var(--brand)] shrink-0" />
            <a href="tel:0980800401" className="text-white hover:text-[color:var(--brand)] transition">
              09 80 80 04 01
            </a>
            <span className="text-white/30">·</span>
            <span>du lundi au vendredi, 9 h – 18 h</span>
          </div>
        </div>

        <div className="hidden lg:block relative">
          <div className="aspect-[4/5] rounded overflow-hidden border border-white/15">
            <Image
              src="/prelys/img-stmaur.png"
              alt="Agences Prelys Courtage"
              width={520}
              height={650}
              priority
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
