"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, ExternalLink } from "lucide-react";
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
 * Autocomplete sur le référentiel IDF (1266 communes).
 * Marque visuellement les communes ayant des données disponibles
 * (slug listé dans `availableSlugs`) — les autres sont en grisé
 * avec mention "données en cours".
 */
export default function CommuneSearch({
  availableSlugs,
}: {
  availableSlugs: string[];
}) {
  const [all, setAll] = useState<CommuneRefSearch[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(assetUrl("/data/idf/communes.json"))
      .then((r) => (r.ok ? r.json() : Promise.reject("404")))
      .then((d: CommuneRefSearch[]) => setAll(d))
      .catch((e) => setError(String(e)));
  }, []);

  const availableSet = useMemo(() => new Set(availableSlugs), [availableSlugs]);

  const filtered = useMemo(() => {
    if (!all || !query.trim()) return [];
    const q = query
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
    return all
      .filter((c) => {
        const n = c.nom.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
        return n.includes(q) || c.code_postal.includes(q) || c.code_insee.includes(q);
      })
      .slice(0, 12);
  }, [all, query]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tapez le nom de votre ville ou son code postal…"
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-[color:var(--line)] bg-white text-[15px] text-ink placeholder:text-ink-mute focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand-strong/20"
          aria-label="Rechercher une commune"
        />
      </div>

      {error && (
        <p className="text-[11px] text-ink-mute">
          Référentiel IDF indisponible ({error}).
        </p>
      )}

      {query.trim() && filtered.length > 0 && (
        <ul className="border border-[color:var(--line)] rounded-xl overflow-hidden divide-y divide-[color:var(--line-soft)] bg-white">
          {filtered.map((c) => {
            const isAvailable = availableSet.has(c.slug);
            return (
              <li key={c.code_insee}>
                {isAvailable ? (
                  <Link
                    href={`/carte/ville/${c.slug}/`}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-warm transition"
                  >
                    <span>
                      <span className="text-ink font-medium">{c.nom}</span>
                      <span className="text-ink-mute text-[12px] ml-2">
                        {c.code_postal} · dept {c.code_dept}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-[12px] text-brand-strong">
                      Carte <ExternalLink size={11} />
                    </span>
                  </Link>
                ) : (
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span>
                      <span className="text-ink-soft">{c.nom}</span>
                      <span className="text-ink-mute text-[12px] ml-2">
                        {c.code_postal} · dept {c.code_dept}
                      </span>
                    </span>
                    <span className="text-[11px] text-ink-mute italic">
                      données en cours
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {query.trim() && filtered.length === 0 && all && (
        <p className="text-[12px] text-ink-mute px-1">
          Aucune commune correspondante dans le référentiel IDF.
        </p>
      )}
    </div>
  );
}
