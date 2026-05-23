export type ViewMode = "dots" | "heatmap";
export type TypeFilter = "all" | "Appartement" | "Maison";

export interface MapFilters {
  yearRange: [number, number];
  typeFilter: TypeFilter;
  viewMode: ViewMode;
  minSales: number;
  showPipeline: boolean;
  showPermits: boolean;
}

export interface PermitFeature {
  updated: string;
  year: number;
  type_bati: string;
  area_m2: number;
  code_iris: string | null;
  nom_iris: string | null;
}

export interface PipelineLogement {
  numero_dpe: string;
  addr: string;
  type_bati: string | null;
  annee_construction: number | null;
  surface: number | null;
  etiquette_dpe: "E" | "F" | "G";
  etiquette_ges: string | null;
  chauffage: string | null;
  date_dpe: string;
  code_iris: string;
  nom_iris: string;
  proba_sale_12m: number;
  signals_json: string;
  model_version?: string;
}

export interface PipelineSignal {
  label: string;
  feature?: string;
  value?: number;
  coef?: number;
  logit_delta?: number;
  weight?: number; // legacy heuristic fallback
}

export interface CommuneAvg {
  pct_proprio: number | null;
  pct_hlm: number | null;
  pct_appart: number | null;
  pct_cadres: number | null;
  pct_bac5p: number | null;
  pct_etrangers: number | null;
  pct_0_14: number | null;
  pct_65p: number | null;
  dvf_median_price: number | null;
  dvf_median_ppsqm: number | null;
  dvf_sales_total: number;
  bpe_total: number;
  population: number;
  n_log: number;
}

export interface IrisProps {
  code_iris: string;
  nom_iris: string;
  type_iris: string | null;
  lat?: number;
  lng?: number;
  population: number | null;
  n_log: number | null;
  n_rp: number | null;
  pct_proprio: number | null;
  pct_hlm: number | null;
  pct_appart: number | null;
  pct_cadres: number | null;
  pct_bac5p: number | null;
  pct_etrangers: number | null;
  pct_0_14: number | null;
  pct_65p: number | null;
  bpe_total: number | null;
  bpe_commerces: number | null;
  bpe_enseignement: number | null;
  bpe_sante: number | null;
  dpe: Record<string, number> | null;
  // DVF spatial-joined
  dvf_sales_total: number;
  dvf_sales_appt: number;
  dvf_sales_maison: number;
  dvf_median_price: number | null;
  dvf_median_ppsqm: number | null;
  dvf_by_year: { year: number; sales: number; median_price: number }[];
  // Rankings (added by enrich_iris_aggregates.py)
  rank_pct_cadres?: number;
  rank_pct_bac5p?: number;
  rank_pct_proprio?: number;
  rank_pct_appart?: number;
  rank_dvf_median_ppsqm?: number;
  rank_dvf_median_price?: number;
  rank_dvf_sales_total?: number;
  rank_bpe_total?: number;
  rank_attractivity_score?: number;
  rank_total_pct_cadres?: number;
  rank_total_pct_bac5p?: number;
  rank_total_pct_proprio?: number;
  rank_total_attractivity_score?: number;
  attractivity_score?: number;
  commune_avg?: CommuneAvg;
  // Transport (added by enrich_commune_extras.py)
  rer_distance_m?: number;
  rer_nearest?: string;
  rer_walking_min?: number;
}

export interface CommuneRisks {
  commune: string;
  code_insee: string;
  georisques_url: string;
  n_risks_present: number;
  risks: Record<string, { category: string; label: string; status: string }>;
}
