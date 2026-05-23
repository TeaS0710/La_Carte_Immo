import { ArrowRight } from "lucide-react";

export default function RecrutementSection() {
  return (
    <section className="bg-[#212529] text-white">
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-24 grid md:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-start">
        <div>
          <div className="text-[12px] uppercase tracking-[0.18em] text-[color:var(--brand)] mb-4">
            Réseau Prelys
          </div>
          <h2 className="text-3xl md:text-[2.5rem] font-bold tracking-tight leading-tight text-balance mb-5">
            Nous recrutons.
          </h2>
          <p className="text-white/75 leading-relaxed max-w-md mb-7 text-[16px]">
            Plus de 170 zones disponibles partout en France pour ouvrir une
            agence sous l&apos;enseigne Prelys. Un réseau bien noté par ses
            collaborateurs, et accompagné dans son lancement.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://www.jouvremonagenceprelys.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded bg-[color:var(--brand)] text-white font-medium text-[15px] hover:bg-[color:var(--brand-strong)] transition min-h-[44px]"
            >
              Ouvrir mon agence
              <ArrowRight size={16} />
            </a>
            <a
              href="https://recrutement.prelys-courtage.com/fr"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded border border-white/25 text-white hover:bg-white/10 transition min-h-[44px]"
            >
              Voir les offres
            </a>
          </div>
        </div>

        <div className="text-white/80 text-[15px] leading-relaxed border-l border-white/15 pl-6 lg:pl-8">
          <p className="mb-3">
            Sur Glassdoor, 100 % des collaborateurs approuvent le PDG et
            98 % recommandent le réseau.
          </p>
          <p className="text-white/55 text-[13px]">
            Indicateurs Glassdoor, réseau Prelys Courtage, France.
          </p>
        </div>
      </div>
    </section>
  );
}
