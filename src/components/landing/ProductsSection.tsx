import Image from "next/image";
import { assetUrl } from "@/lib/url";
import { ArrowRight } from "lucide-react";

const products = [
  {
    img: "/prelys/13.png",
    title: "Prêt immobilier",
    blurb:
      "Négociation auprès des 14 banques partenaires pour obtenir votre meilleur financement.",
    href: "https://www.prelys-courtage.com/",
  },
  {
    img: "/prelys/14.png",
    title: "Rachat de crédits",
    blurb:
      "Regroupement de plusieurs prêts en une mensualité unique réduite, étude gratuite.",
    href: "https://www.prelys-courtage.com/",
  },
  {
    img: "/prelys/15.png",
    title: "Assurance de prêt",
    blurb:
      "Délégation d&apos;assurance emprunteur pour alléger le coût total du crédit.",
    href: "https://www.prelys-courtage.com/",
  },
  {
    img: "/prelys/16.png",
    title: "Prêt professionnel",
    blurb:
      "Financement de votre activité, locaux ou matériel avec un courtier dédié.",
    href: "https://www.prelys-courtage.com/",
  },
];

export default function ProductsSection() {
  return (
    <section className="bg-white border-b border-[color:var(--line-soft)] py-20 md:py-24">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-12 max-w-2xl">
          <div className="text-[12px] uppercase tracking-[0.18em] text-[color:var(--brand-strong)] mb-3">
            Nos solutions
          </div>
          <h2 className="text-3xl md:text-[2.25rem] font-semibold tracking-tight text-ink leading-tight text-balance">
            Un courtier pour chaque projet
          </h2>
          <p className="text-ink-soft mt-4 leading-relaxed text-[16px]">
            Obtenez facilement votre dossier de prêt en ligne ou en agence,
            selon vos préférences.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-12">
          {products.map((p) => (
            <a
              key={p.title}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col"
            >
              <div className="aspect-[4/3] relative bg-[#f8f9fa] overflow-hidden mb-4">
                <Image
                  src={assetUrl(p.img)}
                  alt={p.title}
                  fill
                  sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 95vw"
                  className="object-cover"
                />
              </div>
              <h3 className="text-lg font-semibold text-ink mb-2">{p.title}</h3>
              <p className="text-[14px] text-ink-soft leading-relaxed mb-3">{p.blurb}</p>
              <span className="inline-flex items-center gap-1.5 text-[14px] text-[color:var(--brand-strong)] group-hover:text-[color:var(--brand)] transition">
                En savoir plus
                <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
