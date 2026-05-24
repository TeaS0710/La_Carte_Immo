"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Box, Table } from "lucide-react";
import { assetUrl } from "@/lib/url";
import RegionMap from "@/components/carte/RegionMap";

/**
 * Wrapper client pour la carte du département. Permet d'utiliser
 * RegionMap (composant client) avec un filtre dept depuis une page
 * server-side.
 */
export default function DeptCarteClient({
  code,
  nom,
  availableSlugsCount,
}: {
  code: string;
  nom: string;
  availableSlugsCount: number;
}) {
  const [mounted, setMounted] = useState(false);
  const [is3d, setIs3d] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  return (
    <div className="relative w-full h-[480px] sm:h-[560px] rounded-2xl overflow-hidden border border-[color:var(--line)] shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
      {mounted ? (
        <RegionMap is3d={is3d} deptFilter={code} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-warm text-sm text-ink-mute">
          Chargement de la carte départementale…
        </div>
      )}

      {/* Bandeau contexte */}
      <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-sm rounded-xl border border-[color:var(--line)] px-3 py-2 max-w-[280px] shadow-sm">
        <div className="text-[10px] uppercase tracking-[0.12em] text-brand-strong">
          Département {code}
        </div>
        <div className="text-[13px] font-semibold text-ink leading-tight">
          {nom}
        </div>
        <div className="text-[11px] text-ink-soft mt-0.5">
          {availableSlugsCount} commune{availableSlugsCount > 1 ? "s" : ""} cliquable{availableSlugsCount > 1 ? "s" : ""}
        </div>
      </div>

      {/* Toolbar coin haut droit */}
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        <Link
          href={assetUrl(`/carte/region/idf`)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-[color:var(--line)] text-[12px] text-ink font-medium hover:bg-surface-warm transition shadow-sm"
          aria-label="Voir le tableau régional"
        >
          <Table size={13} className="text-brand-strong" />
          Tableau
        </Link>
        <button
          type="button"
          onClick={() => setIs3d((v) => !v)}
          aria-pressed={is3d}
          aria-label={is3d ? "Désactiver la vue 3D" : "Activer la vue 3D"}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-[12px] font-medium transition shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-strong/30 ${
            is3d
              ? "bg-brand text-white border-brand"
              : "bg-white text-ink border-[color:var(--line)] hover:bg-surface-warm"
          }`}
        >
          <Box size={13} aria-hidden="true" />
          3D
        </button>
      </div>
    </div>
  );
}
