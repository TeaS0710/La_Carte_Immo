import Header from "@/components/landing/Header";
import { Database, ShieldCheck, GitBranch, Sparkles } from "lucide-react";

export const metadata = {
  title: "Méthodologie · La Carte Prelys",
  description:
    "Comment La Carte Prelys est construite : sources d'État officielles, calculs, modèles, audit factualité. Transparence intégrale sur le pipeline data.",
};

const SOURCES = [
  { name: "DGFiP DVF", description: "Demandes de Valeurs Foncières — toutes les transactions immobilières publiques de France. Mise à jour semestrielle.", granularite: "Parcelle cadastrale", millesime: "2021-2025", url: "https://www.data.gouv.fr/fr/datasets/demandes-de-valeurs-foncieres-geolocalisees/" },
  { name: "INSEE Recensement 2020", description: "Population, ménages, CSP, diplômes, parc de logements. Une base par thématique (pop, log, cfm, dpl).", granularite: "IRIS (~2000 hab)", millesime: "2020 (publication 2023)", url: "https://www.insee.fr/fr/statistiques/7704076" },
  { name: "INSEE IRIS 2024", description: "Polygones géographiques officiels des quartiers infra-communaux français.", granularite: "IRIS", millesime: "2024", url: "https://www.insee.fr/fr/information/2017499" },
  { name: "ADEME DPE", description: "Diagnostics de Performance Énergétique de chaque logement (étiquette A à G).", granularite: "Logement", millesime: "Tous diagnostics actifs", url: "https://data.ademe.fr/datasets/dpe03existant" },
  { name: "IGN BD TOPO", description: "Base topographique détaillée : bâti, parcelles, voies, équipements.", granularite: "Bâtiment", millesime: "Mise à jour continue", url: "https://geoservices.ign.fr/bdtopo" },
  { name: "Base Adresse Nationale (BAN)", description: "Référentiel officiel des adresses françaises, autocomplete via api-adresse.data.gouv.fr.", granularite: "Adresse postale", millesime: "Mise à jour quotidienne", url: "https://adresse.data.gouv.fr/" },
  { name: "INSEE BPE 2024", description: "Base Permanente des Équipements : commerces, écoles, santé, services.", granularite: "Équipement géolocalisé", millesime: "2024", url: "https://www.insee.fr/fr/statistiques/3568656" },
  { name: "Géorisques", description: "Risques majeurs naturels et technologiques (PPR, ICPE, Radon, RGA, BASOL, BASIAS).", granularite: "Commune", millesime: "Mise à jour continue", url: "https://www.georisques.gouv.fr/" },
  { name: "GASPAR (PPR)", description: "Plans de Prévention des Risques approuvés et leurs périmètres réglementaires.", granularite: "Commune", millesime: "Officiel", url: "https://www.georisques.gouv.fr/donnees/bases-de-donnees/gaspar" },
  { name: "Etalab Cadastre", description: "Parcelles cadastrales et empreintes bâti en données ouvertes.", granularite: "Parcelle", millesime: "Mise à jour mensuelle", url: "https://cadastre.data.gouv.fr/" },
];

const INFERENCES = [
  { icon: GitBranch, title: "Spatial joins", description: "Croisement géométrique entre transactions DVF (points), polygones IRIS et empreintes bâti cadastre — sans geopandas, juste shapely.prepared pour la performance." },
  { icon: Sparkles, title: "Modèle de probabilité de vente 12 mois", description: "Régression logistique (sklearn) calibrée sur l'historique DVF × DPE. Score par logement basé sur l'étiquette énergie, l'âge du bâti, l'activité de la rue, le quartier." },
  { icon: Database, title: "Projection ARIMA + bootstrap", description: "Modèle temporel sur le prix médian mensuel, avec intervalle de confiance par bootstrap des résidus (5000 itérations)." },
  { icon: ShieldCheck, title: "Audit factualité des notes IA", description: "Chaque chiffre cité dans une analyse rédigée par LLM est automatiquement recoupé contre la donnée source. Un score % indique combien de chiffres ont été retrouvés." },
];

export default function MethodoPage() {
  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-5 py-10 space-y-10">
        <header>
          <div className="text-[11px] uppercase tracking-[0.15em] text-brand-strong mb-1">
            Transparence
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold text-ink mb-3">
            Méthodologie
          </h1>
          <p className="text-ink-soft text-[15px] leading-relaxed max-w-3xl">
            La Carte Prelys agrège et croise {SOURCES.length} bases de données officielles
            d&apos;État pour produire ses analyses. Tout le code et toutes les sources sont
            documentés ici. Aucune donnée privée, aucun scraping, aucun cookie tiers.
          </p>
        </header>

        <section>
          <h2 className="text-[12px] uppercase tracking-[0.15em] text-ink-soft mb-3">
            Bases de données utilisées
          </h2>
          <div className="space-y-2.5">
            {SOURCES.map((s) => (
              <div key={s.name} className="border border-[color:var(--line)] rounded-xl bg-white p-4">
                <div className="flex items-start justify-between gap-4 mb-1.5">
                  <div className="text-[14px] font-semibold text-ink leading-tight">{s.name}</div>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-brand-strong hover:text-ink whitespace-nowrap"
                  >
                    Source officielle →
                  </a>
                </div>
                <p className="text-[12.5px] text-ink-soft leading-relaxed mb-2">{s.description}</p>
                <div className="flex gap-3 flex-wrap text-[11px] text-ink-soft">
                  <span><strong className="text-ink">Granularité :</strong> {s.granularite}</span>
                  <span className="text-ink-mute">·</span>
                  <span><strong className="text-ink">Millésime :</strong> {s.millesime}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-[12px] uppercase tracking-[0.15em] text-ink-soft mb-3">
            Inférences et modèles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {INFERENCES.map((i) => (
              <div key={i.title} className="border border-[color:var(--line)] rounded-xl bg-white p-4">
                <div className="flex items-start gap-3">
                  <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-brand-soft/40 shrink-0">
                    <i.icon size={15} className="text-brand-strong" aria-hidden="true" />
                  </span>
                  <div>
                    <div className="text-[14px] font-semibold text-ink leading-tight mb-1">
                      {i.title}
                    </div>
                    <p className="text-[12px] text-ink-soft leading-relaxed">{i.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[color:var(--line)] bg-surface-warm/40 p-5">
          <h2 className="text-[12px] uppercase tracking-[0.15em] text-ink-soft mb-3">
            Garanties
          </h2>
          <ul className="space-y-2 text-[13px] text-ink-soft leading-relaxed">
            <li>· <strong className="text-ink">Aucun scraping</strong> : toutes les données proviennent d&apos;APIs publiques ou de bulk downloads officiels.</li>
            <li>· <strong className="text-ink">Aucune donnée personnelle</strong> : les analyses se font à l&apos;échelle IRIS (~2000 habitants), jamais nominative.</li>
            <li>· <strong className="text-ink">Code source ouvert</strong> : le pipeline Python et le frontend Next.js sont consultables (open source).</li>
            <li>· <strong className="text-ink">Conformité RGPD</strong> : pas de cookies tiers, pas de tracking, pas de transfert vers serveur tiers.</li>
            <li>· <strong className="text-ink">Audit factualité automatique</strong> : chaque chiffre cité dans les notes IA est recoupé contre la source.</li>
          </ul>
        </section>

        <footer className="text-[11px] text-ink-mute leading-relaxed border-t border-[color:var(--line-soft)] pt-5">
          La Carte Prelys est mise à disposition gratuitement à titre démonstratif. Les
          données sont indicatives et doivent être recoupées par un professionnel avant
          tout engagement contractuel (compromis, mandat, conseil en investissement).
        </footer>
      </main>
    </>
  );
}
