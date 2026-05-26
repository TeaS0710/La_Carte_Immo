"use client";

import { useEffect, useState } from "react";
import { MousePointer2, X } from "lucide-react";

const STORAGE_KEY = "prelys.onboarding.iris.v1";

/**
 * Bandeau pédagogique discret affiché lors de la 1re visite d'une carte
 * commune-level. Indique à l'agent immobilier qu'un clic sur un quartier
 * ouvre sa fiche détaillée. Se masque dès qu'on clique sur un IRIS (signal
 * "compris") ou via la croix.
 *
 * Stocké via localStorage pour ne plus se ré-afficher.
 */
export default function OnboardingHint({
  hasIrisLayer,
  hasInteracted,
}: {
  hasIrisLayer: boolean;
  hasInteracted: boolean;
}) {
  const [show, setShow] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!hasIrisLayer) return;
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(STORAGE_KEY)) return;
    // Petit délai pour laisser la carte charger avant d'afficher le hint
    const t = window.setTimeout(() => setShow(true), 900);
    return () => window.clearTimeout(t);
  }, [hasIrisLayer]);

  // Dès qu'on interagit avec un IRIS, dismiss
  useEffect(() => {
    if (hasInteracted && show) dismiss();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasInteracted]);

  function dismiss() {
    setClosing(true);
    window.setTimeout(() => {
      setShow(false);
      try {
        window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
      } catch {
        // localStorage indisponible (Safari private) — pas de persistance, OK
      }
    }, 200);
  }

  if (!show) return null;

  // Layout :
  //   - Desktop (sm+) : top-[88px] center, max-w-md (ne s'étire pas vers la
  //     stack droite, évite l'interception de clic sur les boutons).
  //   - Mobile (< sm) : bottom-[90px] center, max-w-[calc(100vw-32px)] :
  //     positionné AU-DESSUS de la légende et SOUS la stack droite (qui est
  //     top-[140px]) → aucun chevauchement avec les boutons d'action.
  //   - Le wrapper a `pointer-events-none` ; seuls le contenu intérieur et
  //     le bouton dismiss sont pointer-events-auto → la zone autour reste
  //     cliquable pour la carte.
  return (
    <div
      className={`no-print no-presentation absolute z-30 pointer-events-none left-1/2 -translate-x-1/2 transition-opacity duration-200 ${closing ? "opacity-0" : "opacity-100"} bottom-[90px] sm:bottom-auto sm:top-[88px]`}
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto inline-flex items-center gap-3 bg-white border border-[color:var(--brand)]/40 text-ink rounded-2xl px-4 py-2.5 text-[13px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] max-w-[calc(100vw-32px)] sm:max-w-md">
        <div className="rounded-full bg-brand/15 p-1.5 shrink-0">
          <MousePointer2 size={14} className="text-brand-strong" />
        </div>
        <div className="leading-tight min-w-0">
          <strong className="text-ink">Cliquez un quartier</strong>
          <span className="text-ink-soft"> pour voir son profil détaillé.</span>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-full p-2 text-ink-mute hover:text-ink hover:bg-surface-warm min-w-[36px] min-h-[36px] flex items-center justify-center"
          aria-label="Masquer ce conseil"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
