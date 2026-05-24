"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Box, History, Info, MapPin, Train } from "lucide-react";
import RegionMap from "@/components/carte/RegionMap";
import AddressSearch from "@/components/carte/AddressSearch";

export default function RegionCarteClient({
  availableSlugs = [],
}: {
  availableSlugs?: string[];
}) {
  const [mounted, setMounted] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);
  const [is3d, setIs3d] = useState(false);
  const [showGPE, setShowGPE] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const dismiss = () => setHintDismissed(true);
    document.addEventListener("click", dismiss, { once: true });
    return () => document.removeEventListener("click", dismiss);
  }, []);

  return (
    <main className="relative w-full" style={{ height: "calc(100vh - 68px)" }}>
      {mounted ? (
        <RegionMap is3d={is3d} showGPE={showGPE} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-warm text-sm text-ink-mute">
          Chargement de la carte régionale…
        </div>
      )}

      {/* Bandeau de contexte top-left avec recherche d'adresse */}
      <div className="absolute top-4 left-4 z-10 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.18)] border border-[color:var(--line)] px-5 py-4 w-[340px] max-w-[calc(100vw-32px)]">
        <div className="text-[11px] uppercase tracking-[0.15em] text-brand-strong mb-1 inline-flex items-center gap-1.5">
          <MapPin size={11} />
          Région
        </div>
        <h1 className="text-[17px] font-semibold text-ink leading-tight mb-3">
          Île-de-France
        </h1>
        <AddressSearch availableSlugs={availableSlugs} placeholder="Tapez une adresse ou ville…" compact />
        <p className="text-[11px] text-ink-soft leading-relaxed mt-2.5">
          Recherche d&apos;adresse via la Base Adresse Nationale (data.gouv.fr).
          Cliquez sur une commune sur la carte pour ouvrir sa fiche détaillée.
        </p>
      </div>

      {/* Bouton Comparer (vue tableau régionale) */}
      <Link
        href={"/carte/region/idf"}
        className="absolute top-[140px] right-4 z-10 inline-flex items-center gap-2 px-4 py-3 rounded-full bg-brand text-white font-medium text-[15px] shadow-[0_4px_16px_rgba(157,126,68,0.35)] hover:bg-brand-strong transition min-h-[44px]"
      >
        <History size={17} />
        Comparer les villes
      </Link>

      {/* Toggle 3D */}
      <button
        type="button"
        onClick={() => setIs3d((v) => !v)}
        aria-pressed={is3d}
        aria-label={is3d ? "Désactiver la vue 3D" : "Activer la vue 3D"}
        title={is3d ? "Revenir en vue plate" : "Passer en vue 3D"}
        className={`absolute top-[196px] right-4 z-10 inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full font-medium text-[13px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] border transition min-h-[40px] focus:outline-none focus:ring-2 focus:ring-brand-strong focus:ring-offset-2 ${
          is3d
            ? "bg-brand text-white border-brand"
            : "bg-white text-ink border-[color:var(--line)] hover:bg-surface-warm"
        }`}
      >
        <Box size={15} aria-hidden="true" />
        3D
      </button>

      {/* Toggle Grand Paris Express */}
      <button
        type="button"
        onClick={() => setShowGPE((v) => !v)}
        aria-pressed={showGPE}
        aria-label={showGPE ? "Masquer les gares Grand Paris Express" : "Afficher les futures gares Grand Paris Express"}
        title="Calque des futures gares Grand Paris Express (catalyseur de prix)"
        className={`absolute top-[248px] right-4 z-10 inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full font-medium text-[13px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] border transition min-h-[40px] focus:outline-none focus:ring-2 focus:ring-brand-strong focus:ring-offset-2 ${
          showGPE
            ? "bg-brand text-white border-brand"
            : "bg-white text-ink border-[color:var(--line)] hover:bg-surface-warm"
        }`}
      >
        <Train size={15} aria-hidden="true" />
        Gares GPE
      </button>

      {/* Légende */}
      <div
        aria-label="Légende : heatmap pondérée par le volume de ventes DVF, cercles cliquables au-dessus avec couleur reflétant le prix au m² médian."
        className="no-presentation absolute bottom-4 left-4 z-10 bg-white rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.10)] border border-[color:var(--line)] px-4 py-3 text-[13px] text-ink max-w-[calc(100vw-32px)]"
      >
        <div className="text-[11px] uppercase tracking-[0.15em] text-ink-soft mb-1">
          Heatmap des transactions
        </div>
        <div className="text-[11px] text-ink-soft mb-2">
          Densité = volume de ventes DVF 5 ans
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-7 rounded-l-sm bg-[#d9e0d4]" />
          <span className="inline-block h-2.5 w-7 bg-[#a8b8a3]" />
          <span className="inline-block h-2.5 w-7 bg-[#e6cf9a]" />
          <span className="inline-block h-2.5 w-7 bg-[#c09b5a]" />
          <span className="inline-block h-2.5 w-7 bg-[#b54f3a]" />
          <span className="inline-block h-2.5 w-7 rounded-r-sm bg-[#7a2810]" />
        </div>
        <div className="flex items-center justify-between text-[11px] text-ink-soft mt-1 w-44">
          <span>Calme</span>
          <span>Très actif</span>
        </div>
        <div className="text-[11px] text-ink-soft mt-2 pt-2 border-t border-[color:var(--line-soft)]">
          ⬤ cercles cliquables · couleur = prix €/m²
        </div>
      </div>

      {/* Hint au centre — premier clic l'efface */}
      {!hintDismissed && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none transition-opacity">
          <div className="bg-white/95 border border-[color:var(--line)] rounded-full px-4 py-2 text-[13px] text-ink-soft inline-flex items-center gap-2 shadow-sm">
            <Info size={14} className="text-brand-strong" />
            Cliquez sur une commune pour ouvrir sa carte détaillée
          </div>
        </div>
      )}
    </main>
  );
}
