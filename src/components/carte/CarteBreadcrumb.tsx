import { ChevronRight, MapPin } from "lucide-react";

interface Crumb {
  label: string;
  href?: string;
}

/**
 * Breadcrumb cliquable persistant pour les pages carte.
 *
 * Utilise des `<a>` HTML (pas `<Link>` Next.js) — sur output: export, certains
 * Link dans un sub-tree client hydraté ne déclenchent pas la navigation. Le `<a>`
 * force une vraie nav HTTP, qui marche systématiquement et reste rapide grâce
 * au CDN Cloudflare.
 */
export default function CarteBreadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav
      aria-label="Fil d'Ariane"
      className="text-[12px] text-ink-soft inline-flex items-center gap-1 flex-wrap"
    >
      <a
        href="/carte/"
        className="inline-flex items-center gap-1 hover:text-ink hover:bg-surface-warm rounded-full px-1.5 py-0.5 transition group"
        aria-label="Retour à la carte Île-de-France"
        title="Retour à la carte Île-de-France"
      >
        <MapPin
          size={12}
          aria-hidden="true"
          className="text-brand-strong group-hover:text-brand transition"
        />
        <span className="hidden sm:inline font-medium">Île-de-France</span>
      </a>
      {items.map((c, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="inline-flex items-center gap-1">
            <ChevronRight size={11} className="text-ink-mute" aria-hidden="true" />
            {c.href && !isLast ? (
              <a
                href={c.href}
                className="hover:text-ink hover:bg-surface-warm rounded-full px-1.5 py-0.5 transition"
              >
                {c.label}
              </a>
            ) : (
              <span className="text-ink font-medium px-1.5 py-0.5">{c.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
