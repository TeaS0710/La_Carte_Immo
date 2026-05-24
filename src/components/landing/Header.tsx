import Link from "next/link";
import { assetUrl } from "@/lib/url";
import Image from "next/image";
import { Phone, MapPin } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[color:var(--line-soft)]">
      <div className="max-w-6xl mx-auto px-6 h-[68px] flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <Image
            src={assetUrl("/prelys/logo-2-0.png")}
            alt="Prelys Courtage"
            width={120}
            height={38}
            priority
            className="h-9 w-auto object-contain"
          />
        </Link>

        <nav className="hidden lg:flex items-center gap-7 text-[14px] text-ink-soft">
          <a href="https://www.prelys-courtage.com/" target="_blank" rel="noopener noreferrer" className="hover:text-ink transition">
            Nos solutions
          </a>
          <a href="https://www.prelys-courtage.com/saint-maur-des-fosses/" target="_blank" rel="noopener noreferrer" className="hover:text-ink transition">
            L&apos;agence Saint-Maur
          </a>
          <a href="https://www.prelys-courtage.com/trouver-votre-courtier/" target="_blank" rel="noopener noreferrer" className="hover:text-ink transition">
            Trouver un conseiller
          </a>
          <Link
            href="/carte"
            className="text-ink font-semibold hover:text-[color:var(--brand-strong)] transition inline-flex items-center gap-1.5"
          >
            <MapPin size={14} className="text-[color:var(--brand-strong)]" />
            La carte
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="tel:0980800401"
            className="hidden md:inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink transition"
          >
            <Phone size={13} className="text-[color:var(--brand-strong)]" />
            09 80 80 04 01
          </a>
          <a
            href="https://www.prelys-courtage.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm px-4 py-2 rounded-full bg-[color:var(--brand)] text-white font-semibold hover:bg-[color:var(--brand-strong)] transition min-h-[40px] inline-flex items-center"
          >
            Étude gratuite
          </a>
        </div>
      </div>
    </header>
  );
}
