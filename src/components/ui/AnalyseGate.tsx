"use client";

import { useEffect } from "react";
import { Play } from "lucide-react";
import CircularProgress from "./CircularProgress";
import { useFakeAnalysis } from "@/lib/useFakeAnalysis";

/**
 * Encapsule une section pour la révéler après un faux "lancement d'analyse"
 * avec cercle de progression + étapes textuelles.
 *
 * Usage :
 *   <AnalyseGate
 *     title="Analyse démographique"
 *     description="Croisement INSEE 2021 + DVF transactions"
 *     steps={["Lecture du recensement INSEE", "Croisement DVF", "Calcul du score"]}
 *     durationMs={[1800, 3500]}
 *     autoStart   // optionnel
 *   >
 *     {contenuRéel}
 *   </AnalyseGate>
 */
export default function AnalyseGate({
  title,
  description,
  steps,
  durationMs = [1800, 3500],
  buttonLabel,
  children,
  autoStart = false,
}: {
  title: string;
  description?: string;
  steps?: string[];
  durationMs?: [number, number];
  buttonLabel?: string;
  children: React.ReactNode;
  autoStart?: boolean;
}) {
  const { isRunning, isDone, percent, currentStep, start } = useFakeAnalysis({
    minMs: durationMs[0],
    maxMs: durationMs[1],
    steps: steps ?? [
      "Préparation des données…",
      "Analyse en cours…",
      "Finalisation…",
    ],
  });

  useEffect(() => {
    if (autoStart) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isDone) {
    return <>{children}</>;
  }

  if (isRunning) {
    return (
      <div
        className="rounded-xl border border-[color:var(--line)] bg-surface-warm p-5"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-4">
          <CircularProgress percent={percent} size={56} label={currentStep} />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-ink mb-1 leading-tight">
              {title}
            </div>
            <div className="text-[12px] text-ink-soft leading-snug">
              {currentStep}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Idle state — bouton pour lancer
  return (
    <button
      type="button"
      onClick={start}
      className="w-full text-left rounded-xl border border-[color:var(--line)] bg-white p-4 hover:border-brand hover:bg-surface-warm/40 transition group focus:outline-none focus:ring-2 focus:ring-brand-strong focus:ring-offset-2"
      aria-label={`${buttonLabel ?? "Lancer"} : ${title}`}
    >
      <div className="flex items-center gap-4">
        <span className="inline-flex items-center justify-center h-11 w-11 rounded-full bg-brand text-white group-hover:bg-brand-strong transition shrink-0">
          <Play size={16} className="ml-0.5" aria-hidden="true" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-medium text-ink leading-tight">
            {buttonLabel ?? `Lancer l'analyse : ${title}`}
          </div>
          {description && (
            <div className="text-[12px] text-ink-soft mt-0.5 leading-snug">
              {description}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
