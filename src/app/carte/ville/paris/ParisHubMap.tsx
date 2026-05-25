"use client";

import { useEffect, useState } from "react";
import RegionMap from "@/components/carte/RegionMap";

/**
 * Mini-carte pour la page Paris hub. Réutilise RegionMap filtré sur les
 * 20 arrondissements 75101-75120, dans un container fixe 480 px.
 */
export default function ParisHubMap() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  return (
    <div className="relative w-full h-[480px] sm:h-[560px] rounded-2xl overflow-hidden border border-[color:var(--line)] shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
      {mounted ? (
        <RegionMap deptFilter="paris-arr" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-warm text-sm text-ink-mute">
          Chargement de la carte parisienne…
        </div>
      )}
    </div>
  );
}
