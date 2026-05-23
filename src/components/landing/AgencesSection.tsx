import Image from "next/image";
import { assetUrl } from "@/lib/url";

const agences = [
  { img: "/prelys/6.png", name: "Saint-Maur-des-Fossés", region: "Île-de-France" },
  { img: "/prelys/14.png", name: "Rennes", region: "Bretagne" },
  { img: "/prelys/nantes.png", name: "Nantes", region: "Pays de la Loire" },
  { img: "/prelys/15.png", name: "Reims", region: "Grand Est" },
  { img: "/prelys/16.png", name: "Strasbourg", region: "Grand Est" },
  { img: "/prelys/13.png", name: "Nevers", region: "Bourgogne" },
  { img: "/prelys/17.png", name: "Blois", region: "Centre-Val de Loire" },
  { img: "/prelys/19.png", name: "La Rochelle", region: "Nouvelle-Aquitaine" },
  { img: "/prelys/18-1.png", name: "Sables d'Olonne", region: "Pays de la Loire" },
  { img: "/prelys/7.png", name: "Tarbes", region: "Occitanie" },
  { img: "/prelys/5-1.png", name: "Amboise", region: "Centre-Val de Loire" },
  { img: "/prelys/img-st-pierre.jpg", name: "Saint-Pierre", region: "La Réunion" },
  { img: "/prelys/8.png", name: "Saint-Paul", region: "La Réunion" },
];

export default function AgencesSection() {
  return (
    <section className="bg-white border-b border-[color:var(--line-soft)] py-20 md:py-24">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <div className="text-[12px] uppercase tracking-[0.18em] text-[color:var(--brand-strong)] mb-3">
            Notre réseau
          </div>
          <h2 className="text-3xl md:text-[2.5rem] font-semibold tracking-tight text-ink leading-tight text-balance">
            Nos agences en France
          </h2>
          <p className="text-ink-soft mt-4 leading-relaxed">
            Prelys Courtage est présent sur tout le territoire national. Une
            équipe de professionnels experts et réactifs disponibles pour vous
            accompagner dans vos projets de vie.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {agences.map((a) => (
            <div
              key={a.name}
              className="group relative aspect-[4/3] rounded-2xl overflow-hidden border border-[color:var(--line)] bg-[#f8f9fa]"
            >
              <Image
                src={assetUrl(a.img)}
                alt={`Agence Prelys ${a.name}`}
                fill
                sizes="(min-width: 1024px) 22vw, (min-width: 640px) 33vw, 50vw"
                className="object-cover group-hover:scale-[1.04] transition duration-500"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 pt-10">
                <div className="text-white font-semibold text-[15px] leading-tight">
                  {a.name}
                </div>
                <div className="text-white/75 text-[12px] mt-0.5">{a.region}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <a
            href="https://www.prelys-courtage.com/trouver-votre-courtier/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-ink text-white font-medium hover:bg-ink/85 transition min-h-[48px]"
          >
            Trouver votre courtier
          </a>
        </div>
      </div>
    </section>
  );
}
