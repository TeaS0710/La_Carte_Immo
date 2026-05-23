export interface StreetProps {
  street_name: string;
  sales: number;
  sales_appt: number;
  sales_maison: number;
  median_price: number;
  median_price_per_sqm: number | null;
  turnover_score: number;
  turnover_rank: number;
  first_year: number;
  last_year: number;
  years_active: number;
  code_iris?: string;
  nom_iris?: string;
}

export interface ParcelleProps {
  id_parcelle: string;
  address: string;
  sales: number;
  median_price: number;
  median_price_per_sqm: number | null;
  median_rooms: number | null;
  first_sale: string;
  last_sale: string;
}

export interface TransactionProps {
  year: number;
  valeur_fonciere: number;
  type_local: string | null;
  surface_reelle_bati: number | null;
  nombre_pieces_principales: number | null;
  adresse_nom_voie: string;
  price_per_sqm: number | null;
}

export interface CommuneStats {
  commune: string;
  insee: string;
  generated_at: string;
  total_sales: number;
  years_covered: number[];
  streets_with_sales: number;
  median_price: number;
  median_price_per_sqm: number | null;
  by_year: { year: number; sales: number; median_price: number }[];
  top_streets: { street_name: string; sales: number; median_price_per_sqm: number | null }[];
}
