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

  return (
    <div
      className={`no-print no-presentation absolute top-[88px] left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-white border border-[color:var(--brand)]/40 text-ink rounded-2xl px-4 py-2.5 text-[13px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] max-w-[calc(100vw-32px)] transition-opacity duration-200 ${closing ? "opacity-0" : "opacity-100"}`}
      role="status"
      aria-live="polite"
    >
      <div className="rounded-full bg-brand/15 p-1.5 shrink-0">
        <MousePointer2 size={14} className="text-brand-strong" />
      </div>
      <div className="leading-tight">
        <strong className="text-ink">Cliquez un quartier</strong>
        <span className="text-ink-soft"> pour voir son profil détaillé (prix, profil acheteur, équipements, analyse IA).</span>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-full p-1 text-ink-mute hover:text-ink hover:bg-surface-warm"
        aria-label="Masquer ce conseil"
      >
        <X size={14} />
      </button>
    </div>
  );
}
