import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface Crumb {
  label: string;
  href?: string;
}

/**
 * Breadcrumb cliquable persistant pour les pages carte.
 * Premier élément = retour à la carte région IDF (icône maison).
 * Dernier élément non cliquable.
 */
export default function CarteBreadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav
      aria-label="Fil d'Ariane"
      className="text-[12px] text-ink-soft inline-flex items-center gap-1 flex-wrap"
    >
      <Link
        href={"/carte"}
        className="inline-flex items-center gap-1 hover:text-ink transition"
        aria-label="Carte région IDF"
      >
        <Home size={11} aria-hidden="true" />
        <span className="sr-only">IDF</span>
      </Link>
      {items.map((c, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="inline-flex items-center gap-1">
            <ChevronRight size={11} className="text-ink-mute" aria-hidden="true" />
            {c.href && !isLast ? (
              <Link href={c.href} className="hover:text-ink transition">
                {c.label}
              </Link>
            ) : (
              <span className="text-ink font-medium">{c.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
