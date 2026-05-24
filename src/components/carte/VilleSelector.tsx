"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin } from "lucide-react";
import { assetUrl } from "@/lib/url";

interface CommuneRefSearch {
  code_insee: string;
  slug: string;
  nom: string;
  code_dept: string;
  code_postal: string;
  population?: number;
}

/**
 * Sélecteur de commune avec autocomplete, conçu pour s'intégrer dans
 * une barre d'outils en haut de la page carte (compact, dropdown).
 * Ne propose que les communes ayant des données disponibles
 * (slug listé dans `availableSlugs`).
 */
export default function VilleSelector({
  availableSlugs,
  currentSlug,
  compact = false,
}: {
  availableSlugs: string[];
  currentSlug?: string;
  compact?: boolean;
}) {
  const [all, setAll] = useState<CommuneRefSearch[] | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch(assetUrl("/data/idf/communes.json"))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: CommuneRefSearch[]) => setAll(d))
      .catch(() => setAll([]));
  }, []);

  // Click outside to close
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const availableSet = useMemo(() => new Set(availableSlugs), [availableSlugs]);

  const currentCommune = useMemo(() => {
    if (!all || !currentSlug) return null;
    return all.find((c) => c.slug === currentSlug) ?? null;
  }, [all, currentSlug]);

  const filtered = useMemo(() => {
    if (!all) return [];
    if (!query.trim()) {
      // Sans requête : on montre les communes disponibles classées par pop
      return all
        .filter((c) => availableSet.has(c.slug))
        .sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
        .slice(0, 10);
    }
    const q = query.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    return all
      .filter((c) => {
        const n = c.nom.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
        return n.includes(q) || c.code_postal.includes(q) || c.code_insee.includes(q);
      })
      .slice(0, 12);
  }, [all, query, availableSet]);

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-2 bg-white border border-[color:var(--line)] rounded-full hover:border-brand hover:bg-surface-warm/50 transition focus:outline-none focus:ring-2 focus:ring-brand-strong/30 ${
          compact ? "px-3 py-1.5 text-[12.5px]" : "px-4 py-2 text-[13px]"
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <MapPin size={13} className="text-brand-strong" aria-hidden="true" />
        <span className="text-ink font-medium truncate max-w-[160px]">
          {currentCommune?.nom ?? "Changer de ville"}
        </span>
        <Search size={12} className="text-ink-mute" aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute top-full mt-1 right-0 sm:right-auto sm:left-0 w-[min(320px,calc(100vw-32px))] bg-white border border-[color:var(--line)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.18)] overflow-hidden z-50">
          <div className="relative border-b border-[color:var(--line-soft)] p-2">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-mute pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tapez un nom ou code postal…"
              className="w-full pl-8 pr-3 py-2 text-[13px] bg-transparent text-ink placeholder:text-ink-mute focus:outline-none"
              autoFocus
              aria-label="Rechercher une commune"
            />
          </div>
          <ul className="max-h-[320px] overflow-y-auto">
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-[12px] text-ink-mute">
                {query ? "Aucune commune correspondante" : "Aucune commune disponible"}
              </li>
            )}
            {filtered.map((c) => {
              const isAvailable = availableSet.has(c.slug);
              return (
                <li key={c.code_insee}>
                  {isAvailable ? (
                    <button
                      type="button"
                      onClick={() => {
                        router.push(`/carte/ville/${c.slug}`);
                        setOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-surface-warm transition flex items-center justify-between gap-3"
                    >
                      <span>
                        <span className="text-ink font-medium text-[13px]">{c.nom}</span>
                        <span className="text-ink-mute text-[11px] ml-2">
                          {c.code_postal}
                        </span>
                      </span>
                      <span className="text-[10px] text-brand-strong uppercase tracking-wide font-semibold">
                        Carte
                      </span>
                    </button>
                  ) : (
                    <div className="px-4 py-2 flex items-center justify-between gap-3 cursor-not-allowed">
                      <span>
                        <span className="text-ink-soft text-[13px]">{c.nom}</span>
                        <span className="text-ink-mute text-[11px] ml-2">
                          {c.code_postal}
                        </span>
                      </span>
                      <span className="text-[10px] text-ink-mute italic">en cours</span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
