"use client";

import { useEffect, useRef, useState } from "react";

export interface FakeAnalysisOptions {
  minMs?: number;
  maxMs?: number;
  steps?: string[];
}

export interface FakeAnalysisState {
  isRunning: boolean;
  isDone: boolean;
  percent: number;
  currentStep: string;
  start: () => void;
  reset: () => void;
}

/**
 * Faux loader avec progression et étapes nommées.
 *
 * Pourquoi ? La perception de qualité d'un outil d'analyse est proportionnelle
 * au temps de calcul perçu. Toutes les données sont en réalité pré-générées
 * statiquement, mais l'utilisateur reste sous l'impression que le moteur tourne.
 *
 * Le délai est aléatoire dans [minMs, maxMs] pour éviter la sensation d'un
 * timer mécanique, et la barre n'avance pas linéairement (easing) pour donner
 * la sensation d'étapes de calcul réelles.
 *
 * Cache mémoire : si on a déjà "calculé" cette analyse, on ne rejoue pas.
 */
export function useFakeAnalysis({
  minMs = 2800,
  maxMs = 5200,
  steps = [
    "Initialisation du moteur d'analyse…",
    "Synchronisation des bases sources…",
    "Application du modèle…",
    "Finalisation du rapport…",
  ],
}: FakeAnalysisOptions = {}): FakeAnalysisState {
  const [isRunning, setIsRunning] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [percent, setPercent] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);

  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const durationRef = useRef<number>(0);

  const start = () => {
    if (isRunning || isDone) return;
    durationRef.current = minMs + Math.random() * (maxMs - minMs);
    startTimeRef.current = performance.now();
    setStepIdx(0);
    setPercent(0);
    setIsRunning(true);
  };

  const reset = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setIsRunning(false);
    setIsDone(false);
    setPercent(0);
    setStepIdx(0);
  };

  useEffect(() => {
    if (!isRunning) return;

    const tick = (now: number) => {
      if (startTimeRef.current == null) return;
      const elapsed = now - startTimeRef.current;
      const t = Math.min(1, elapsed / durationRef.current);
      // Easing : commence vite, ralentit en fin pour sensation "compute"
      const eased = 1 - Math.pow(1 - t, 1.8);
      const pct = Math.round(eased * 100);
      setPercent(pct);

      // Étape : segments égaux de la durée
      const segLen = 1 / steps.length;
      const idx = Math.min(steps.length - 1, Math.floor(t / segLen));
      setStepIdx(idx);

      if (t >= 1) {
        setIsRunning(false);
        setIsDone(true);
        setPercent(100);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isRunning, steps.length]);

  return {
    isRunning,
    isDone,
    percent,
    currentStep: steps[stepIdx] ?? "",
    start,
    reset,
  };
}
