import { useEffect } from "react";

/**
 * Ferme un panneau / une modale quand l'utilisateur appuie sur Escape.
 * Aussi accessible que possible : focus trap est géré par le navigateur
 * pour les éléments natifs (button/input/a) déjà présents dans la card.
 */
export function useEscape(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [active, onClose]);
}
