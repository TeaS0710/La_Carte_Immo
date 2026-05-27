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
  //   - Desktop (lg+) : top-[88px] center, max-w-md
  //   - Mobile / tablet (< lg) : caché. La carte est déjà très chargée (header,
  //     breadcrumb, filtres, stack droite, légende) — un hint en plus pollue
  //     l'écran. L'utilisateur découvrira en cliquant naturellement.
  //   - Wrapper pointer-events-none, contenu auto → zone hors texte cliquable.
  return (
    <div
      className={`hidden lg:block no-print no-presentation absolute z-30 pointer-events-none left-1/2 -translate-x-1/2 transition-opacity duration-200 top-[88px] ${closing ? "opacity-0" : "opacity-100"}`}
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto inline-flex items-center gap-2.5 bg-white border border-[color:var(--brand)]/40 text-ink rounded-2xl px-4 py-2.5 text-[13px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] max-w-md">
        <div className="rounded-full bg-brand/15 p-1.5 shrink-0">
          <MousePointer2 size={14} className="text-brand-strong" />
        </div>
        <div className="leading-tight min-w-0">
          <strong className="text-ink">Cliquez un quartier</strong>
          <span className="text-ink-soft"> pour voir son profil.</span>
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
