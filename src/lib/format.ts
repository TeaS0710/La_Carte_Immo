const eur = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export const formatEur = (v: number | null | undefined): string =>
  v == null || Number.isNaN(v) ? "-" : eur.format(v);

export const formatEurPerSqm = (v: number | null | undefined): string =>
  v == null || Number.isNaN(v) ? "-" : `${nf.format(Math.round(v))} €/m²`;

export const formatNum = (v: number | null | undefined): string =>
  v == null || Number.isNaN(v) ? "-" : nf.format(v);

export const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { year: "numeric", month: "short", day: "numeric" });
};

const STREET_SMALL_WORDS = new Set([
  "de", "la", "le", "du", "des", "les", "d", "l", "et", "à", "au", "aux", "sur",
]);
const STREET_ABBR: Record<string, string> = {
  "av": "Av.",
  "bd": "Bd",
  "r": "R.",
  "pl": "Pl.",
  "imp": "Imp.",
  "ch": "Ch.",
  "all": "All.",
  "rte": "Rte",
  "sq": "Sq.",
};

export const formatStreet = (raw: string | null | undefined): string => {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => {
      if (i > 0 && STREET_SMALL_WORDS.has(w)) return w;
      if (STREET_ABBR[w]) return STREET_ABBR[w];
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
};
