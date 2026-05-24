"use client";

import { useEffect, useState } from "react";
import { communeDataUrl } from "@/lib/url";
import {
  X, Users, Home, Building, Zap, TrendingUp, Award, Target, FileText,
  Train, ShieldAlert, Printer, Image as ImageIcon,
} from "lucide-react";
import type {
  IrisProps, CommuneAvg, PipelineLogement, PipelineSignal, CommuneRisks,
} from "./types";
import { formatEur, formatEurPerSqm, formatNum } from "@/lib/format";
import ExternalLookup from "./ExternalLookup";
import RisquesPanel from "./RisquesPanel";
import AnalyseGate from "@/components/ui/AnalyseGate";
import { useEscape } from "@/lib/useEscape";

type Analysis = { ok: boolean; text?: string; error?: string; source?: string; model?: string; duration_s?: number };
type PipelineFeature = { properties: PipelineLogement };

export default function IrisCard({
  codeInsee,
  iris,
  onClose,
}: {
  codeInsee: string;
  iris: IrisProps;
  onClose: () => void;
}) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [pipeline, setPipeline] = useState<PipelineLogement[] | null>(null);
  const [risks, setRisks] = useState<CommuneRisks | null>(null);
  const [factuality, setFactuality] = useState<{ score: number | null; n_cited: number; n_matched: number } | null>(null);
  useEscape(true, onClose);

  useEffect(() => {
    let cancelled = false;
    fetch(communeDataUrl(codeInsee, "iris_analyses.json"))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((all: Record<string, Analysis>) => {
        if (!cancelled) setAnalysis(all[iris.code_iris] ?? null);
      })
      .catch(() => {
        if (!cancelled) setAnalysis(null);
      });
    fetch(communeDataUrl(codeInsee, "pipeline.geojson"))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { features: PipelineFeature[] }) => {
        if (cancelled) return;
        const here = data.features
          .map((f) => f.properties)
          .filter((p) => p.code_iris === iris.code_iris)
          .sort((a, b) => b.proba_sale_12m - a.proba_sale_12m);
        setPipeline(here);
      })
      .catch(() => {
        if (!cancelled) setPipeline([]);
      });
    fetch(communeDataUrl(codeInsee, "commune_risks.json"))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((r: CommuneRisks) => {
        if (!cancelled) setRisks(r);
      })
      .catch(() => {});
    fetch(communeDataUrl(codeInsee, "iris_analyses_audit.json"))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { per_iris: Record<string, { factuality_score?: number; n_cited?: number; n_matched?: number }> }) => {
        if (cancelled) return;
        const entry = data.per_iris[iris.code_iris];
        if (entry?.factuality_score != null) {
          setFactuality({
            score: entry.factuality_score,
            n_cited: entry.n_cited ?? 0,
            n_matched: entry.n_matched ?? 0,
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [iris.code_iris, codeInsee]);

  const ignOrthoUrl = `https://www.geoportail.gouv.fr/carte?c=${iris.lng ?? 2.49},${iris.lat ?? 48.80}&z=17&l0=ORTHOIMAGERY.ORTHOPHOTOS::GEOPORTAIL:OGC:WMTS(1)&permalink=yes`;
  const dpeMix = iris.dpe ? Object.entries(iris.dpe).sort((a, b) => b[1] - a[1])[0] : null;
  const apptShare =
    iris.dvf_sales_total > 0
      ? Math.round((iris.dvf_sales_appt / iris.dvf_sales_total) * 100)
      : 0;

  const commune: CommuneAvg | undefined = parseJsonField<CommuneAvg>(
    iris.commune_avg as unknown,
  );
  const byYear = parseJsonField<{ year: number; sales: number; median_price: number }[]>(
    iris.dvf_by_year as unknown,
  ) ?? [];

  const totalIris = iris.rank_total_attractivity_score ?? 34;

  return (
    <aside className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-[min(640px,calc(100vw-32px))] max-h-[85vh] overflow-y-auto bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.18)] border border-[color:var(--line)]">
      {/* ── Header ── */}
      <header className="sticky top-0 bg-white flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-[color:var(--line-soft)] z-10 print:static">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.15em] text-brand-strong mb-0.5">
            Quartier IRIS {iris.code_iris}
          </div>
          <h3 className="text-xl font-semibold text-ink leading-tight truncate">
            {iris.nom_iris}
          </h3>
          <div className="text-xs text-ink-mute mt-0.5">
            INSEE 2021 · DVF 2021-2025 · BPE 2024 · Géorisques · DPE ADEME
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 no-print">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full p-2 text-ink-soft hover:text-ink hover:bg-surface-warm min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Imprimer / PDF"
            title="Imprimer cette fiche (mode rapport)"
          >
            <Printer size={16} />
          </button>
          <a
            href={ignOrthoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full p-2 text-ink-soft hover:text-ink hover:bg-surface-warm min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Vue aérienne IGN"
            title="Ouvrir la vue aérienne IGN"
          >
            <ImageIcon size={16} />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-ink-soft hover:text-ink hover:bg-surface-warm min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      <div className="p-5 space-y-6">
        {/* ── Attractivity score (top) ── */}
        {iris.attractivity_score != null && iris.rank_attractivity_score && (
          <section className="bg-surface-warm border border-[color:var(--line)] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] uppercase tracking-[0.15em] text-ink-soft">
                Score d&apos;attractivité acheteur
              </div>
              <RankBadge rank={iris.rank_attractivity_score} total={totalIris} />
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <div className="tabular text-[28px] font-semibold text-ink leading-none">
                {iris.attractivity_score.toFixed(0)}
              </div>
              <div className="text-sm text-ink-mute">/ 100</div>
            </div>
            <Gauge value={iris.attractivity_score} />
            <p className="text-[12px] text-ink-soft mt-3 leading-relaxed">
              Indicateur composite : part de cadres, niveau de diplôme, taux de
              propriétaires, prix au m² et densité d&apos;équipements.
            </p>
          </section>
        )}

        {/* ── DVF market ── */}
        {iris.dvf_sales_total > 0 && (
          <section>
            <SectionTitle icon={<TrendingUp size={12} />}>
              Marché immobilier (5 ans)
            </SectionTitle>
            <AnalyseGate
              title="Analyse du marché immobilier"
              description="Croisement DVF · prix médian, volume, comparaison commune"
              buttonLabel="Lancer l'analyse du marché immobilier"
              steps={[
                "Lecture des transactions DVF (DGFiP)…",
                "Calcul du prix médian et du €/m²…",
                "Comparaison avec la moyenne communale…",
                "Préparation des graphiques…",
              ]}
              durationMs={[2000, 3600]}
            >
              <div className="grid grid-cols-3 gap-px bg-[color:var(--line-soft)] rounded-xl overflow-hidden border border-[color:var(--line)] mb-4">
                <KPI label="Ventes" value={formatNum(iris.dvf_sales_total)} accent />
                <KPI label="Prix médian" value={formatEur(iris.dvf_median_price)} />
                <KPI label="€/m²" value={formatEurPerSqm(iris.dvf_median_ppsqm)} />
              </div>

              {commune?.dvf_median_ppsqm && iris.dvf_median_ppsqm && (
                <CompareBar
                  label="Prix au m² médian"
                  value={iris.dvf_median_ppsqm}
                  avg={commune.dvf_median_ppsqm}
                  fmt={(v) => `${Math.round(v).toLocaleString("fr-FR")} €/m²`}
                  rank={iris.rank_dvf_median_ppsqm}
                  total={totalIris}
                />
              )}

              {byYear.length > 1 && <YearChart data={byYear} />}

              <div className="mt-4">
                <div className="text-[11px] uppercase tracking-[0.12em] text-ink-mute mb-1.5">
                  Répartition Appartement / Maison
                </div>
                <div className="h-2.5 rounded-full bg-[color:var(--line-soft)] overflow-hidden flex">
                  <div className="bg-brand h-full" style={{ width: `${apptShare}%` }} />
                  <div
                    className="bg-[color:var(--sage)] h-full"
                    style={{ width: `${100 - apptShare}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-ink-soft mt-1.5">
                  <span>
                    {iris.dvf_sales_appt} appart. ({apptShare} %)
                  </span>
                  <span>
                    {iris.dvf_sales_maison} maison{iris.dvf_sales_maison > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </AnalyseGate>
          </section>
        )}

        {/* ── Socio-demographic ── */}
        <section>
          <SectionTitle icon={<Users size={12} />}>Population & profil</SectionTitle>
          <div className="space-y-4">
            <BigStat
              label="Habitants"
              value={iris.population ? `${iris.population.toLocaleString("fr-FR")} hab.` : "-"}
              detail={`${iris.pct_0_14 ?? "-"} % de 0-14 ans · ${iris.pct_65p ?? "-"} % de 65 ans et +`}
              icon={<Users size={14} />}
            />

            {iris.pct_cadres != null && (
              <CompareBar
                label="Part de cadres & professions sup."
                value={iris.pct_cadres}
                avg={commune?.pct_cadres}
                fmt={(v) => `${v.toFixed(1)} %`}
                rank={iris.rank_pct_cadres}
                total={iris.rank_total_pct_cadres ?? totalIris}
              />
            )}
            {iris.pct_bac5p != null && (
              <CompareBar
                label="Part de diplômés Bac+5 et plus"
                value={iris.pct_bac5p}
                avg={commune?.pct_bac5p}
                fmt={(v) => `${v.toFixed(1)} %`}
                rank={iris.rank_pct_bac5p}
                total={iris.rank_total_pct_bac5p ?? totalIris}
              />
            )}
          </div>
        </section>

        {/* ── Housing ── */}
        <section>
          <SectionTitle icon={<Home size={12} />}>Logement</SectionTitle>
          <div className="space-y-4">
            <BigStat
              label="Parc total"
              value={iris.n_log ? `${iris.n_log.toLocaleString("fr-FR")} logements` : "-"}
              detail={
                iris.n_rp
                  ? `${iris.n_rp.toLocaleString("fr-FR")} résidences principales`
                  : ""
              }
              icon={<Home size={14} />}
            />
            {iris.pct_proprio != null && (
              <CompareBar
                label="Part de propriétaires"
                value={iris.pct_proprio}
                avg={commune?.pct_proprio}
                fmt={(v) => `${v.toFixed(1)} %`}
                rank={iris.rank_pct_proprio}
                total={iris.rank_total_pct_proprio ?? totalIris}
              />
            )}
            {iris.pct_appart != null && (
              <CompareBar
                label="Part d'appartements (vs maisons)"
                value={iris.pct_appart}
                avg={commune?.pct_appart}
                fmt={(v) => `${v.toFixed(1)} %`}
                rank={iris.rank_pct_appart}
                total={totalIris}
              />
            )}
          </div>
        </section>

        {/* ── Transport (RER A) ── */}
        {iris.rer_distance_m != null && (
          <section>
            <SectionTitle icon={<Train size={12} />}>
              Transport en commun
            </SectionTitle>
            <div className="rounded-lg border border-[color:var(--line)] bg-surface-warm px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.15em] text-ink-soft mb-0.5">
                Gare RER A la plus proche
              </div>
              <div className="text-[15px] text-ink font-medium leading-tight">
                {iris.rer_nearest}
              </div>
              <div className="text-[12.5px] text-ink-soft tabular mt-1">
                {iris.rer_distance_m} m à vol d&apos;oiseau · {iris.rer_walking_min} min à pied
              </div>
            </div>
          </section>
        )}

        {/* ── Risques Géorisques (commune-wide) ── */}
        {risks && risks.n_risks_present > 0 && (
          <section>
            <SectionTitle icon={<ShieldAlert size={12} />}>
              Risques majeurs (Géorisques)
            </SectionTitle>
            <RisquesPanel risks={risks} />
          </section>
        )}

        {/* ── Equipments & energy ── */}
        {iris.bpe_total != null && iris.bpe_total > 0 && (
          <section>
            <SectionTitle icon={<Building size={12} />}>
              Équipements & énergie
            </SectionTitle>
            <div className="space-y-4">
              <BigStat
                label="Équipements (BPE 2024)"
                value={`${iris.bpe_total} recensés`}
                detail={[
                  iris.bpe_commerces != null
                    ? `${iris.bpe_commerces} commerces`
                    : null,
                  iris.bpe_enseignement != null
                    ? `${iris.bpe_enseignement} écoles`
                    : null,
                  iris.bpe_sante != null
                    ? `${iris.bpe_sante} santé/social`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                icon={<Building size={14} />}
              />
              {dpeMix && (
                <BigStat
                  label="DPE majoritaire"
                  value={`Étiquette ${dpeMix[0]}`}
                  detail={`${dpeMix[1]} logements sur cette classe énergétique`}
                  icon={<Zap size={14} />}
                />
              )}
            </div>
          </section>
        )}

        {/* ── Pipeline : logements à fort potentiel dans ce quartier ── */}
        {pipeline && pipeline.length > 0 && (
          <section>
            <SectionTitle icon={<Target size={12} />}>
              Logements à fort potentiel de vente
            </SectionTitle>
            <AnalyseGate
              title="Pipeline ventes probables"
              description={`${pipeline.length} candidats à scorer dans ce quartier`}
              buttonLabel="Lancer l'analyse du pipeline"
              steps={[
                "Filtrage des logements DPE F/G…",
                "Croisement avec l'âge du bâti…",
                "Application du modèle de probabilité de vente 12 mois…",
                "Ordonnancement par score décroissant…",
              ]}
              durationMs={[3000, 5200]}
            >
              <div className="text-[12px] text-ink-soft mb-3 leading-relaxed">
                <strong className="text-ink">{pipeline.length}</strong> logements DPE F/G ou
                anciens identifiés dans ce quartier · top 10 par probabilité 12 mois
              </div>
              <ul className="divide-y divide-[color:var(--line-soft)] border border-[color:var(--line)] rounded-xl overflow-hidden">
                {pipeline.slice(0, 10).map((p) => (
                  <PipelineRow key={p.numero_dpe} logement={p} />
                ))}
              </ul>
              <p className="text-[11px] text-ink-mute mt-2 leading-relaxed">
                Probabilité de vente estimée sous 12 mois à partir des données
                DPE et de l&apos;historique des transactions. Les facteurs
                indiquent ce qui rend chaque logement plus ou moins susceptible
                d&apos;être mis en vente.
              </p>
            </AnalyseGate>
          </section>
        )}

        {/* ── Analyse IA structurée (Ollama) ── */}
        {analysis?.ok && analysis.text && (
          <section>
            <SectionTitle icon={<FileText size={12} />}>
              Note d&apos;analyse contextuelle du quartier
            </SectionTitle>
            <AnalyseGate
              title="Note d'analyse contextuelle"
              description="Rédaction automatique croisée avec les sources officielles"
              buttonLabel="Lancer la rédaction de la note"
              steps={[
                "Lecture des indicateurs INSEE, DVF, BPE…",
                "Identification du profil acheteur cible…",
                "Analyse de la dynamique du marché local…",
                "Rédaction de la synthèse…",
                "Vérification des chiffres cités…",
              ]}
              durationMs={[4200, 6800]}
            >
              <div className="border border-[color:var(--line)] rounded-lg p-5 bg-white">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[color:var(--line-soft)]">
                  <div className="text-[11px] uppercase tracking-[0.15em] text-ink-soft inline-flex items-center gap-2">
                    <FileText size={12} className="text-brand-strong" />
                    Note d&apos;analyse quartier
                  </div>
                  <div className="flex items-center gap-2">
                    {factuality && (
                      <span
                        className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          factuality.score! >= 80
                            ? "border-[color:var(--sage)]/60 bg-[color:var(--sage-soft)] text-ink"
                            : "border-[color:var(--brand-soft)] bg-[color:var(--brand-soft)]/25 text-brand-strong"
                        }`}
                        title={`${factuality.n_matched} sur ${factuality.n_cited} chiffres retrouvés dans les données source`}
                      >
                        {factuality.n_matched}/{factuality.n_cited} chiffres vérifiés
                      </span>
                    )}
                  </div>
                </div>
                <MarkdownLite text={analysis.text} />
                <p className="text-[11px] text-ink-mute mt-4 pt-3 border-t border-[color:var(--line-soft)] leading-relaxed">
                  Note rédigée automatiquement à partir des données INSEE, DVF,
                  BPE et OSM du quartier. Les chiffres cités sont automatiquement
                  recoupés contre les sources officielles. À relire avant toute
                  communication client.
                </p>
              </div>
            </AnalyseGate>
          </section>
        )}

        {/* ── Sources footer ── */}
        <footer className="border-t border-[color:var(--line-soft)] pt-4 text-[11px] text-ink-mute leading-relaxed">
          Sources : INSEE (population, logement, CSP, diplômes, bases
          infracommunales 2021) · BPE INSEE 2024 (équipements) · ADEME (DPE) ·
          DGFiP (DVF, transactions 2021-2025). Rang calculé sur les 34 IRIS de
          Saint-Maur-des-Fossés.
        </footer>
      </div>
    </aside>
  );
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-[0.15em] text-brand-strong mb-3 flex items-center gap-1.5">
      {icon}
      {children}
    </div>
  );
}

function KPI({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`px-3 py-3 ${accent ? "bg-[color:var(--brand-soft)]/25" : "bg-white"}`}>
      <div className="text-[10px] uppercase tracking-[0.15em] text-ink-mute mb-0.5">{label}</div>
      <div className={`tabular text-base font-semibold ${accent ? "text-brand-strong" : "text-ink"}`}>
        {value}
      </div>
    </div>
  );
}

function BigStat({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3.5">
      <div className="h-8 w-8 shrink-0 rounded-full bg-[color:var(--brand-soft)]/30 text-brand-strong flex items-center justify-center">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-[0.12em] text-ink-mute">{label}</div>
        <div className="text-[15px] text-ink font-medium tabular">{value}</div>
        {detail && <div className="text-[12px] text-ink-soft mt-0.5">{detail}</div>}
      </div>
    </div>
  );
}

function CompareBar({
  label,
  value,
  avg,
  fmt,
  rank,
  total,
}: {
  label: string;
  value: number;
  avg: number | null | undefined;
  fmt: (v: number) => string;
  rank?: number;
  total: number;
}) {
  // Visual scale : 0 → 1.5x avg (or 1.5x value if no avg)
  const max = avg ? Math.max(value, avg) * 1.4 : value * 1.4;
  const valuePct = Math.min(100, (value / max) * 100);
  const avgPct = avg ? Math.min(100, (avg / max) * 100) : null;
  const delta = avg ? value - avg : 0;
  const positive = delta >= 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <div className="text-[12px] text-ink-soft truncate">{label}</div>
        {rank && <RankBadge rank={rank} total={total} />}
      </div>
      <div className="flex items-baseline gap-2 mb-1.5">
        <div className="tabular text-[15px] font-semibold text-ink">{fmt(value)}</div>
        {avg != null && (
          <div
            className={`text-[12px] tabular ${positive ? "text-[color:var(--sage)]" : "text-terracotta"}`}
          >
            {positive ? "+" : ""}
            {fmt(delta).replace(/\s?€\/m²|\s?%/g, "")} vs commune
          </div>
        )}
      </div>
      {/* Bar with avg marker */}
      <div className="relative h-2 rounded-full bg-[color:var(--line-soft)] overflow-visible">
        <div
          className="absolute left-0 top-0 bottom-0 rounded-full bg-brand"
          style={{ width: `${valuePct}%` }}
        />
        {avgPct != null && (
          <div
            className="absolute top-[-3px] bottom-[-3px] w-0.5 bg-ink/60"
            style={{ left: `${avgPct}%` }}
            title={`Moyenne commune : ${fmt(avg!)}`}
          />
        )}
      </div>
      {avg != null && (
        <div className="text-[11px] text-ink-mute mt-1 tabular">
          Commune : {fmt(avg)}
        </div>
      )}
    </div>
  );
}

function RankBadge({ rank, total }: { rank: number; total: number }) {
  const top10 = rank <= Math.max(3, Math.round(total / 10));
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
        top10
          ? "bg-[color:var(--brand-strong)] border-[color:var(--brand-strong)] text-white"
          : "bg-surface-warm border-[color:var(--line)] text-ink-soft"
      } shrink-0 tabular`}
    >
      <Award size={9} />
      {ordinal(rank)} / {total}
    </span>
  );
}

function ordinal(n: number): string {
  if (n === 1) return "1ᵉʳ";
  return `${n}ᵉ`;
}

function Gauge({ value }: { value: number }) {
  return (
    <div className="h-1.5 rounded-full bg-[color:var(--line-soft)] overflow-hidden">
      <div
        className="h-full bg-brand-strong transition-all duration-700"
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  );
}

/** Sober markdown renderer : **bold** + paragraphs. No HTML injection. */
function MarkdownLite({ text }: { text: string }) {
  // Nettoyage des marqueurs IA typiques avant rendu :
  // - les "->" lazy markdown deviennent une vraie flèche unicode
  // - les "—" / "–" double-tirets se normalisent en " · " (séparateur visuel sobre)
  // - les "..." se normalisent en "…"
  const cleaned = text
    .replace(/\s+->\s+/g, " → ")
    .replace(/\s+—\s+/g, " · ")
    .replace(/\s+–\s+/g, " · ")
    .replace(/\.{3}/g, "…");
  // Split on blank lines into blocks; each block can be a heading (** wrap) or paragraph
  const blocks = cleaned.trim().split(/\n\s*\n/);
  return (
    <div className="space-y-3 text-[13.5px] text-ink leading-relaxed">
      {blocks.map((b, i) => {
        // **heading** alone on a line
        const headingMatch = b.match(/^\*\*([^*]+)\*\*\s*$/);
        if (headingMatch) {
          return (
            <h4
              key={i}
              className="text-[12px] font-semibold uppercase tracking-[0.08em] text-brand-strong mt-3 first:mt-0"
            >
              {headingMatch[1].trim()}
            </h4>
          );
        }
        // bullet list (lines starting with - or • or *)
        if (/^[\-•\*]\s/m.test(b)) {
          const items = b.split("\n").filter((l) => /^[\-•\*]\s/.test(l));
          return (
            <ul key={i} className="list-disc list-inside space-y-1 marker:text-brand-strong">
              {items.map((item, j) => (
                <li key={j} className="pl-1">
                  {renderInline(item.replace(/^[\-•\*]\s+/, ""))}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="leading-relaxed">
            {renderInline(b)}
          </p>
        );
      })}
    </div>
  );
}

function renderInline(s: string): React.ReactNode {
  // Render **bold** and \n line breaks within a paragraph
  const parts: React.ReactNode[] = [];
  const segments = s.split(/(\*\*[^*]+\*\*)/g);
  segments.forEach((seg, i) => {
    if (seg.startsWith("**") && seg.endsWith("**")) {
      parts.push(
        <strong key={i} className="text-ink font-semibold">
          {seg.slice(2, -2)}
        </strong>,
      );
    } else {
      seg.split("\n").forEach((line, j, arr) => {
        parts.push(line);
        if (j < arr.length - 1) parts.push(<br key={`${i}-${j}`} />);
      });
    }
  });
  return parts;
}

function YearChart({ data }: { data: { year: number; sales: number; median_price: number }[] }) {
  const maxSales = Math.max(...data.map((d) => d.sales));
  return (
    <div className="mt-4">
      <div className="text-[11px] uppercase tracking-[0.12em] text-ink-mute mb-2">
        Ventes par année
      </div>
      <div className="flex items-end gap-1.5 h-20 mb-1">
        {data.map((d) => {
          const ratio = maxSales > 0 ? d.sales / maxSales : 0;
          const h = Math.max(4, Math.round(ratio * 72));
          return (
            <div key={d.year} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-brand rounded-t-sm hover:bg-brand-strong transition cursor-help"
                style={{ height: `${h}px` }}
                title={`${d.year} : ${d.sales} ventes · ${formatEur(d.median_price)} médian`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5">
        {data.map((d) => (
          <div key={d.year} className="flex-1 text-center text-[11px] text-ink-mute tabular">
            {d.year}
          </div>
        ))}
      </div>
    </div>
  );
}

function PipelineRow({ logement }: { logement: PipelineLogement }) {
  const [open, setOpen] = useState(false);
  let signals: PipelineSignal[] = [];
  try {
    signals = JSON.parse(logement.signals_json || "[]");
  } catch {
    /* ignore */
  }
  return (
    <li className="px-3 py-2.5">
      <div className="flex items-center gap-3">
        <DpeBadge etiquette={logement.etiquette_dpe} />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] text-ink font-medium truncate">{logement.addr}</div>
          <div className="text-[11px] text-ink-mute mt-0.5">
            {logement.type_bati ?? "-"} · {logement.annee_construction ?? "-"} ·{" "}
            {logement.surface ? `${logement.surface} m²` : "-"}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[13px] tabular font-semibold text-brand-strong">
            {logement.proba_sale_12m.toFixed(1)}
            <span className="text-[10px] text-ink-mute font-normal"> %</span>
          </div>
          <div className="flex flex-col items-end gap-0.5 mt-0.5">
            <ExternalLookup source="maps" query={logement.addr} variant="inline" />
            <ExternalLookup source="pagesblanches" query={logement.addr} variant="inline" />
            <ExternalLookup source="pappers" query={logement.addr} variant="inline" />
          </div>
        </div>
      </div>
      {signals.length > 0 && (
        <div className="mt-2 pl-10">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="text-[11px] text-ink-mute hover:text-brand-strong transition inline-flex items-center gap-1"
          >
            {open ? "Masquer" : "Pourquoi cette probabilité ?"} ({signals.length} facteurs)
          </button>
          {open && (
            <ul className="mt-1.5 space-y-1 text-[11.5px]">
              {signals.map((s, i) => {
                const delta = s.logit_delta ?? (s.weight ? s.weight / 50 : 0);
                const positive = delta >= 0;
                return (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="text-ink-soft">{s.label}</span>
                    <span
                      className={`font-semibold tabular shrink-0 ${
                        positive ? "text-brand-strong" : "text-ink-mute"
                      }`}
                    >
                      {positive ? "+" : ""}
                      {delta.toFixed(2)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

function DpeBadge({ etiquette }: { etiquette: "E" | "F" | "G" }) {
  const bg = etiquette === "G" ? "#7a2810" : etiquette === "F" ? "#b54f3a" : "#c09b5a";
  return (
    <div
      className="h-7 w-7 shrink-0 rounded-md text-white font-bold text-[13px] flex items-center justify-center tabular"
      style={{ background: bg }}
      title={`Étiquette DPE ${etiquette}`}
    >
      {etiquette}
    </div>
  );
}

function parseJsonField<T>(field: unknown): T | undefined {
  if (field == null) return undefined;
  if (typeof field === "string") {
    try {
      return JSON.parse(field) as T;
    } catch {
      return undefined;
    }
  }
  return field as T;
}
