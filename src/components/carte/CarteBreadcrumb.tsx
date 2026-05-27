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
      className="text-[13.5px] lg:text-[12px] text-ink-soft inline-flex items-center gap-1 lg:flex-wrap"
    >
      <a
        href="/carte/"
        className="inline-flex items-center gap-1 hover:text-ink hover:bg-surface-warm rounded-full px-1.5 py-0.5 transition group shrink-0"
        aria-label="Retour à la carte Île-de-France"
        title="Retour à la carte Île-de-France"
      >
        <MapPin
          size={14}
          aria-hidden="true"
          className="text-brand-strong group-hover:text-brand transition lg:!w-3 lg:!h-3"
        />
        <span className="hidden sm:inline font-medium">Île-de-France</span>
      </a>
      {items.map((c, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="inline-flex items-center gap-1 min-w-0">
            <ChevronRight size={12} className="text-ink-mute shrink-0 lg:!w-[11px] lg:!h-[11px]" aria-hidden="true" />
            {c.href && !isLast ? (
              <a
                href={c.href}
                className="hover:text-ink hover:bg-surface-warm rounded-full px-1.5 py-0.5 transition truncate"
              >
                {c.label}
              </a>
            ) : (
              <span className="text-ink font-semibold lg:font-medium px-1.5 py-0.5 truncate">{c.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
