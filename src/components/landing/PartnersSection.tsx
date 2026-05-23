import Image from "next/image";

const banks = [
  { src: "/prelys/bnp.png", alt: "BNP Paribas" },
  { src: "/prelys/LCL.png", alt: "LCL" },
  { src: "/prelys/credit-agricole.png", alt: "Crédit Agricole" },
  { src: "/prelys/societe-generale.webp", alt: "Société Générale" },
  { src: "/prelys/banque-populaire.jpg", alt: "Banque Populaire" },
  { src: "/prelys/caisse-epargne.jpg", alt: "Caisse d'Épargne" },
  { src: "/prelys/credit-mutuel1.webp", alt: "Crédit Mutuel" },
  { src: "/prelys/bred.webp", alt: "BRED" },
  { src: "/prelys/bfc-3.webp", alt: "BFC" },
  { src: "/prelys/lbp-2.webp", alt: "La Banque Postale" },
  { src: "/prelys/logo-cepac.jpg", alt: "CEPAC" },
  { src: "/prelys/logo-cfcal.webp", alt: "CFCAL" },
  { src: "/prelys/Credit-Agiricole-Run.webp", alt: "Crédit Agricole Réunion" },
  { src: "/prelys/sofider.webp", alt: "Sofider" },
];

const insurers = [
  { src: "/prelys/allianz.jpg", alt: "Allianz" },
  { src: "/prelys/axa.jpg", alt: "AXA" },
  { src: "/prelys/April.png", alt: "April" },
  { src: "/prelys/cardif.jpg", alt: "Cardif" },
  { src: "/prelys/logo-generalli.jpg", alt: "Generali" },
  { src: "/prelys/logo-swisslife.jpg", alt: "SwissLife" },
  { src: "/prelys/logo-cnp.jpg", alt: "CNP Assurances" },
  { src: "/prelys/logo-afi-esca.jpg", alt: "AFI ESCA" },
  { src: "/prelys/logo-utwin.jpg", alt: "Utwin" },
  { src: "/prelys/metlife.jpg", alt: "MetLife" },
  { src: "/prelys/logo-creditlift.webp", alt: "CreditLift" },
];

export default function PartnersSection() {
  return (
    <section className="bg-white border-b border-[color:var(--line-soft)] py-20 md:py-24">
      <div className="max-w-6xl mx-auto px-6 space-y-16">
        <div>
          <div className="text-center mb-10">
            <div className="text-[12px] uppercase tracking-[0.18em] text-[color:var(--brand-strong)] mb-3">
              Partenaires bancaires
            </div>
            <h2 className="text-3xl md:text-[2.25rem] font-semibold tracking-tight text-ink">
              Nos banques partenaires
            </h2>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-x-6 gap-y-8 items-center">
            {banks.map((b) => (
              <div
                key={b.alt}
                className="relative h-16 grayscale opacity-65 hover:grayscale-0 hover:opacity-100 transition"
              >
                <Image
                  src={b.src}
                  alt={b.alt}
                  fill
                  sizes="(min-width: 768px) 14vw, 33vw"
                  className="object-contain"
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-center mb-10">
            <div className="text-[12px] uppercase tracking-[0.18em] text-[color:var(--brand-strong)] mb-3">
              Partenaires assurance
            </div>
            <h2 className="text-3xl md:text-[2.25rem] font-semibold tracking-tight text-ink">
              Nos assurances partenaires
            </h2>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-x-6 gap-y-8 items-center">
            {insurers.map((i) => (
              <div
                key={i.alt}
                className="relative h-16 grayscale opacity-65 hover:grayscale-0 hover:opacity-100 transition"
              >
                <Image
                  src={i.src}
                  alt={i.alt}
                  fill
                  sizes="(min-width: 768px) 16vw, 33vw"
                  className="object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
