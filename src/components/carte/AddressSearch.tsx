"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, ArrowRight } from "lucide-react";
import { assetUrl } from "@/lib/url";

interface BanFeature {
  properties: {
    label: string;
    score: number;
    type: "housenumber" | "street" | "locality" | "municipality";
    citycode: string;   // INSEE
    city: string;
    postcode: string;
    context: string;
    name: string;
  };
  geometry: { coordinates: [number, number] };
}

interface CommuneRefSearch {
  code_insee: string;
  slug: string;
  nom: string;
  code_dept: string;
}

/**
 * Recherche d'adresse via la Base Adresse Nationale (api-adresse.data.gouv.fr).
 *
 * - Autocomplete avec debounce 250ms
 * - Au clic résultat :
 *   - Si la commune correspondante a des data déployées → route /carte/ville/{slug}
 *   - Sinon → message "Données en cours pour {commune}"
 * - Filtre géographique IDF (préfixes INSEE 75/77/78/91/92/93/94/95)
 */
export default function AddressSearch({
  availableSlugs,
  placeholder = "Rechercher une adresse en Île-de-France…",
  compact = false,
}: {
  availableSlugs: string[];
  placeholder?: string;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BanFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [communeRefs, setCommuneRefs] = useState<CommuneRefSearch[]>([]);
  const [open, setOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    fetch(assetUrl("/data/idf/communes.json"))
      .then((r) => r.ok ? r.json() : [])
      .then(setCommuneRefs)
      .catch(() => setCommuneRefs([]));
  }, []);

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
  const inseeToCommune = useMemo(() => {
    const m: Record<string, CommuneRefSearch> = {};
    for (const c of communeRefs) m[c.code_insee] = c;
    return m;
  }, [communeRefs]);

  // Recherche BAN avec debounce
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!query.trim() || query.length < 3) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        // BAN : limite IDF via lat/lon centroïde + autocomplete
        // Note : on ne peut pas filtrer dept directement, on filtre côté client
        const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=8&autocomplete=1&lat=48.85&lon=2.45`;
        const r = await fetch(url);
        if (!r.ok) throw new Error("API BAN indisponible");
        const data = await r.json();
        // Filtre IDF (citycode commence par 75/77/78/91/92/93/94/95)
        const idfPrefixes = ["75", "77", "78", "91", "92", "93", "94", "95"];
        const filtered = (data.features as BanFeature[]).filter((f) =>
          idfPrefixes.includes(f.properties.citycode.slice(0, 2)),
        );
        setResults(filtered);
      } catch (e) {
        setErrorMsg((e as Error).message);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  function handleClick(f: BanFeature) {
    const commune = inseeToCommune[f.properties.citycode];
    if (!commune) {
      setErrorMsg(`Commune ${f.properties.city} pas encore dans le référentiel IDF`);
      return;
    }
    if (!availableSet.has(commune.slug)) {
      setErrorMsg(`Données en cours de génération pour ${commune.nom}. Réessayez bientôt.`);
      return;
    }
    setOpen(false);
    router.push(`/carte/ville/${commune.slug}`);
  }

  return (
    <div ref={boxRef} className={`relative ${compact ? "" : "w-full"}`}>
      <div className="relative">
        <Search
          size={compact ? 14 : 16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setErrorMsg(null); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={`w-full pl-10 pr-4 rounded-full border border-[color:var(--line)] bg-white text-ink placeholder:text-ink-mute focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand-strong/20 ${
            compact ? "py-2 text-[13px]" : "py-3 text-[15px]"
          }`}
          aria-label="Rechercher une adresse"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-ink-mute">
            …
          </span>
        )}
      </div>

      {open && (results.length > 0 || errorMsg) && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-[color:var(--line)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.18)] overflow-hidden z-50 max-h-[400px] overflow-y-auto">
          {errorMsg && (
            <div className="px-4 py-3 text-[12px] text-brand-strong border-b border-[color:var(--line-soft)] bg-surface-warm">
              ⓘ {errorMsg}
            </div>
          )}
          <ul>
            {results.map((f, i) => {
              const commune = inseeToCommune[f.properties.citycode];
              const isAvailable = commune && availableSet.has(commune.slug);
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => handleClick(f)}
                    className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition ${
                      isAvailable
                        ? "hover:bg-surface-warm cursor-pointer"
                        : "opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <MapPin
                      size={14}
                      className={isAvailable ? "text-brand-strong shrink-0" : "text-ink-mute shrink-0"}
                      aria-hidden="true"
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] text-ink font-medium truncate">
                        {f.properties.label}
                      </span>
                      <span className="block text-[11px] text-ink-mute truncate">
                        {f.properties.city} ({f.properties.postcode})
                        {!isAvailable && " · données en cours"}
                      </span>
                    </span>
                    {isAvailable && (
                      <ArrowRight size={13} className="text-ink-soft shrink-0" aria-hidden="true" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
