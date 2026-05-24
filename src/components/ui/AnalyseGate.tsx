"use client";

import { useEffect } from "react";
import { Play, Check } from "lucide-react";
import CircularProgress from "./CircularProgress";
import { useFakeAnalysis } from "@/lib/useFakeAnalysis";

/**
 * Encapsule une section pour la révéler après un "calcul" feint avec
 * cercle de progression + liste d'étapes corporate (checkmarks).
 *
 * Cache mémoire : le ne relance pas si déjà calculée durant la session
 * (sauf changement de la `key` React parente).
 */
export default function AnalyseGate({
  title,
  description,
  steps,
  durationMs = [2800, 5200],
  buttonLabel,
  sources,
  children,
  autoStart = false,
}: {
  title: string;
  description?: string;
  steps?: string[];
  durationMs?: [number, number];
  buttonLabel?: string;
  /** Petits badges affichés pour signaler les sources de data croisées */
  sources?: string[];
  children: React.ReactNode;
  autoStart?: boolean;
}) {
  const stepsResolved = steps ?? [
    "Initialisation du moteur d'analyse…",
    "Synchronisation des bases sources…",
    "Application du modèle…",
    "Finalisation du rapport…",
  ];
  const { isRunning, isDone, percent, currentStep, start } = useFakeAnalysis({
    minMs: durationMs[0],
    maxMs: durationMs[1],
    steps: stepsResolved,
  });

  useEffect(() => {
    if (autoStart) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isDone) {
    return <>{children}</>;
  }

  // Calcul de l'étape active : index dans la liste basée sur le step en cours
  const currentIdx = stepsResolved.findIndex((s) => s === currentStep);

  if (isRunning) {
    return (
      <div
        className="rounded-xl border border-[color:var(--line)] bg-white p-5"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-4 mb-4">
          <CircularProgress percent={percent} size={64} label={currentStep} />
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold text-ink mb-0.5 leading-tight">
              {title}
            </div>
            {description && (
              <div className="text-[12px] text-ink-soft leading-snug">
                {description}
              </div>
            )}
            {sources && sources.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {sources.map((s) => (
                  <span
                    key={s}
                    className="inline-block text-[10px] uppercase tracking-wide font-medium text-ink-soft bg-surface-warm border border-[color:var(--line-soft)] px-1.5 py-0.5 rounded"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <ul className="space-y-1.5 border-t border-[color:var(--line-soft)] pt-3">
          {stepsResolved.map((s, i) => {
            const isStepDone = i < currentIdx;
            const isStepActive = i === currentIdx;
            const isStepPending = i > currentIdx;
            return (
              <li
                key={s}
                className={`flex items-center gap-2.5 text-[12.5px] leading-snug transition-opacity ${
                  isStepPending ? "opacity-40" : "opacity-100"
                }`}
              >
                <StepIcon done={isStepDone} active={isStepActive} />
                <span
                  className={
                    isStepDone
                      ? "text-ink-soft line-through decoration-1"
                      : isStepActive
                      ? "text-ink font-medium"
                      : "text-ink-soft"
                  }
                >
                  {s.replace(/…$/, isStepDone ? "" : "…")}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  // Idle state — bouton pour lancer + sources pour signaler la richesse
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
          {sources && sources.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {sources.map((s) => (
                <span
                  key={s}
                  className="inline-block text-[10px] uppercase tracking-wide font-medium text-ink-soft bg-surface-warm border border-[color:var(--line-soft)] px-1.5 py-0.5 rounded"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function StepIcon({ done, active }: { done: boolean; active: boolean }) {
  if (done) {
    return (
      <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-[color:var(--sage)] text-white shrink-0">
        <Check size={10} strokeWidth={3} aria-hidden="true" />
      </span>
    );
  }
  if (active) {
    return (
      <span
        className="inline-flex items-center justify-center h-4 w-4 rounded-full border-2 border-brand-strong border-t-transparent animate-spin shrink-0 motion-reduce:animate-none"
        aria-hidden="true"
      />
    );
  }
  return (
    <span
      className="inline-block h-4 w-4 rounded-full border border-[color:var(--line)] shrink-0"
      aria-hidden="true"
    />
  );
}
