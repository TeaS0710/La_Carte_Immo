"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { assetUrl } from "@/lib/url";
import Image from "next/image";
import { Phone, MapPin, Scale, Menu, X } from "lucide-react";

interface NavLink {
  href: string;
  label: string;
  external?: boolean;
  icon?: React.ReactNode;
  highlight?: boolean;
}

const NAV_LINKS: NavLink[] = [
  { href: "https://www.prelys-courtage.com/", label: "Nos solutions", external: true },
  { href: "https://www.prelys-courtage.com/saint-maur-des-fosses/", label: "L'agence Saint-Maur", external: true },
  { href: "https://www.prelys-courtage.com/trouver-votre-courtier/", label: "Trouver un conseiller", external: true },
  { href: "/carte", label: "La carte", icon: <MapPin size={14} className="text-[color:var(--brand-strong)]" />, highlight: true },
  { href: "/comparateur", label: "Comparateur", icon: <Scale size={14} className="text-[color:var(--brand-strong)]" /> },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  // Ferme le menu mobile lors d'un changement de route (sécurité, car les
  // Link Next.js ne déclenchent pas un événement navigation détectable)
  useEffect(() => {
    if (!menuOpen) return;
    function close() { setMenuOpen(false); }
    window.addEventListener("popstate", close);
    return () => window.removeEventListener("popstate", close);
  }, [menuOpen]);

  // Bloque le scroll quand menu mobile ouvert
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[color:var(--line-soft)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[64px] sm:h-[68px] flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 shrink-0" onClick={() => setMenuOpen(false)}>
          <Image
            src={assetUrl("/prelys/logo-2-0.png")}
            alt="Prelys Courtage"
            width={120}
            height={38}
            priority
            className="h-8 sm:h-9 w-auto object-contain"
          />
        </Link>

        {/* Nav desktop */}
        <nav className="hidden lg:flex items-center gap-7 text-[14px] text-ink-soft">
          {NAV_LINKS.map((l) =>
            l.external ? (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-ink transition"
              >
                {l.label}
              </a>
            ) : (
              <Link
                key={l.href}
                href={l.href}
                prefetch
                className={`${l.highlight ? "text-ink font-semibold" : "text-ink-soft"} hover:text-[color:var(--brand-strong)] transition inline-flex items-center gap-1.5`}
              >
                {l.icon}
                {l.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
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
            className="hidden sm:inline-flex text-sm px-4 py-2 rounded-full bg-[color:var(--brand)] text-white font-semibold hover:bg-[color:var(--brand-strong)] transition min-h-[40px] items-center"
          >
            Étude gratuite
          </a>
          {/* Burger mobile */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-full border border-[color:var(--line)] bg-white text-ink hover:bg-surface-warm transition"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Menu mobile (drawer plein largeur sous le header) */}
      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setMenuOpen(false)}
            className="lg:hidden fixed inset-0 top-[64px] sm:top-[68px] z-40 bg-black/30 backdrop-blur-[2px]"
          />
          <div className="lg:hidden absolute top-full inset-x-0 z-50 bg-white border-b border-[color:var(--line)] shadow-[0_8px_24px_rgba(0,0,0,0.10)]">
            <nav className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-1 text-[15px]">
              {NAV_LINKS.map((l) =>
                l.external ? (
                  <a
                    key={l.href}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMenuOpen(false)}
                    className="inline-flex items-center gap-2 px-3 py-3 rounded-lg text-ink-soft hover:bg-surface-warm hover:text-ink min-h-[44px]"
                  >
                    {l.label}
                  </a>
                ) : (
                  <Link
                    key={l.href}
                    href={l.href}
                    prefetch
                    onClick={() => setMenuOpen(false)}
                    className={`inline-flex items-center gap-2 px-3 py-3 rounded-lg hover:bg-surface-warm hover:text-ink min-h-[44px] ${l.highlight ? "text-ink font-semibold" : "text-ink-soft"}`}
                  >
                    {l.icon}
                    {l.label}
                  </Link>
                ),
              )}
              <div className="mt-2 pt-3 border-t border-[color:var(--line-soft)] flex flex-col gap-2">
                <a
                  href="tel:0980800401"
                  className="inline-flex items-center gap-2 px-3 py-2.5 text-[14px] text-ink-soft hover:text-ink min-h-[44px]"
                >
                  <Phone size={14} className="text-[color:var(--brand-strong)]" />
                  09 80 80 04 01
                </a>
                <a
                  href="https://www.prelys-courtage.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex items-center justify-center px-4 py-3 rounded-full bg-[color:var(--brand)] text-white font-semibold hover:bg-[color:var(--brand-strong)] min-h-[44px]"
                >
                  Étude gratuite
                </a>
              </div>
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
