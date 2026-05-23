import Image from "next/image";
import { assetUrl } from "@/lib/url";

export default function Footer() {
  return (
    <footer className="bg-[#1a1815] text-white/80">
      <div className="max-w-6xl mx-auto px-6 pt-14 pb-10 grid md:grid-cols-[1.2fr_2fr] gap-10">
        <div>
          <Image
            src={assetUrl("/prelys/logo-white-S.png")}
            alt="Prelys Courtage"
            width={140}
            height={45}
            className="h-10 w-auto object-contain mb-5"
          />
          <p className="text-sm leading-relaxed text-white/60 max-w-xs italic">
            « La performance par l&apos;engagement, la réussite par la bienveillance »
          </p>

          <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            <span className="text-[11px] uppercase tracking-wider text-white/70">
              Meilleure Franchise de France 2024
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-sm">
          <FooterCol
            title="Outils"
            links={[
              { label: "La carte du marché", href: "/carte" },
            ]}
          />
          <FooterCol
            title="Prelys Courtage"
            links={[
              { label: "Saint-Maur", href: "https://www.prelys-courtage.com/saint-maur-des-fosses/" },
              { label: "Nos solutions", href: "https://www.prelys-courtage.com/" },
              { label: "Nous rejoindre", href: "https://www.prelys-courtage.com/" },
            ]}
          />
          <FooterCol
            title="Au sujet des données"
            note="DVF (DGFiP) pour les transactions, INSEE pour la socio-démo agrégée, BODACC & Pappers pour les SCI, IGN pour le géocodage. Aucune donnée nominative d'habitant."
          />
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-xs text-white/45">
          <div>© {new Date().getFullYear()} Prelys Courtage Saint-Maur · 7 bis av. Balzac · 01 82 39 04 84</div>
          <div>Données : DGFiP (DVF) · INSEE · IGN · BODACC</div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
  note,
}: {
  title: string;
  links?: { label: string; href: string }[];
  note?: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/40 mb-3">
        {title}
      </div>
      {links && (
        <ul className="space-y-2">
          {links.map((l) => (
            <li key={l.label}>
              <a
                href={l.href}
                target={l.href.startsWith("http") ? "_blank" : undefined}
                rel={l.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="text-white/70 hover:text-white transition"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      )}
      {note && (
        <p className="text-white/55 text-xs leading-relaxed">{note}</p>
      )}
    </div>
  );
}
