"use client";

import { useEffect, useRef, useState } from "react";
import { assetUrl } from "@/lib/url";
import maplibregl, { Map, MapGeoJSONFeature } from "maplibre-gl";
import type { StreetProps } from "@/lib/types";
import { formatStreet } from "@/lib/format";
import type { MapFilters, IrisProps, PipelineLogement, PermitFeature } from "./types";

const SAINT_MAUR_CENTER: [number, number] = [2.4901, 48.8014];

function dpeColor(et: string): string {
  return et === "G" ? "#7a2810" : et === "F" ? "#b54f3a" : "#c09b5a";
}

export default function CarteMap({
  filters,
  selectedIrisCode,
  is3d,
  onSelectStreet,
  onSelectIris,
  onSelectPipeline,
  onSelectPermit,
}: {
  filters: MapFilters;
  selectedIrisCode: string | null;
  is3d: boolean;
  onSelectStreet: (s: StreetProps | null) => void;
  onSelectIris: (i: IrisProps | null) => void;
  onSelectPipeline: (p: PipelineLogement | null) => void;
  onSelectPermit: (p: PermitFeature & { lng: number; lat: number } | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    try {
      // Style vectoriel OpenFreeMap Positron (libre, sans clé, sans quota).
      // Schéma OpenMapTiles → la source "openmaptiles" + source-layer "building"
      // sont disponibles, ce qui permet d'ajouter une couche fill-extrusion
      // pour la vue 3D des bâtiments en relief.
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: "https://tiles.openfreemap.org/styles/positron",
        center: SAINT_MAUR_CENTER,
        zoom: 13.1,
        pitch: 0,
        attributionControl: { compact: true },
        maxBounds: [
          [2.42, 48.77],
          [2.56, 48.83],
        ],
      });

      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false, showZoom: true }),
        "top-right",
      );

      map.on("error", (e) => {
        console.error("[CarteMap] MapLibre error:", e);
      });

      // Force resize repeatedly until canvas matches container
      const resizeMap = () => {
        try {
          map.resize();
        } catch {
          /* map destroyed */
        }
      };
      requestAnimationFrame(resizeMap);
      setTimeout(resizeMap, 100);
      setTimeout(resizeMap, 500);
      setTimeout(resizeMap, 1500);
      window.addEventListener("resize", resizeMap);
      const ro = new ResizeObserver(resizeMap);
      ro.observe(containerRef.current!);
      (map as unknown as { __cleanup?: () => void }).__cleanup = () => {
        window.removeEventListener("resize", resizeMap);
        ro.disconnect();
      };

      map.on("load", async () => {
        try {
          const [streetsRes, txRes, irisRes] = await Promise.all([
            fetch(assetUrl("/data/saint-maur/streets.geojson")),
            fetch(assetUrl("/data/saint-maur/transactions.geojson")),
            fetch(assetUrl("/data/saint-maur/iris.geojson")),
          ]);
          const streets = await streetsRes.json();
          const transactions = await txRes.json();
          const iris = await irisRes.json();

          map.addSource("streets", { type: "geojson", data: streets });
          map.addSource("transactions", { type: "geojson", data: transactions });
          map.addSource("iris", { type: "geojson", data: iris });

          // ─── 3D buildings (source openmaptiles fournie par le style Positron)
          // visibility: none par défaut → activé seulement quand l'utilisateur
          // clique le bouton "3D" dans CarteClient (prop is3d).
          if (map.getSource("openmaptiles")) {
            map.addLayer({
              id: "3d-buildings",
              type: "fill-extrusion",
              source: "openmaptiles",
              "source-layer": "building",
              minzoom: 13,
              layout: { visibility: "none" },
              paint: {
                "fill-extrusion-color": "#c8b89a",
                "fill-extrusion-height": [
                  "coalesce",
                  ["get", "render_height"],
                  ["*", ["coalesce", ["get", "levels"], 2], 3.5],
                ],
                "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
                "fill-extrusion-opacity": 0.75,
              },
            });
          }

          // ─── IRIS choropleth (dual use : click target + heatmap-by-quartier)
          // Color stops calibrated on the actual distribution of dvf_sales_total
          // across the 34 IRIS of Saint-Maur (min=38, q20=363, q40=447,
          // median=492, q60=513, q80=633, max=955).
          map.addLayer({
            id: "iris-fill",
            type: "fill",
            source: "iris",
            paint: {
              "fill-color": [
                "interpolate",
                ["linear"],
                ["get", "dvf_sales_total"],
                0, "#d9e0d4",
                300, "#a8b8a3",
                450, "#e6cf9a",
                550, "#c09b5a",
                700, "#b54f3a",
                900, "#7a2810",
              ],
              // Grille permanente en transparence colorée — fusion avec les dots
              "fill-opacity": 0.32,
            },
          });
          map.addLayer({
            id: "iris-outline",
            type: "line",
            source: "iris",
            paint: {
              "line-color": "rgba(33,37,41,0.35)",
              "line-width": 0.7,
            },
          });
          map.addLayer({
            id: "iris-hover",
            type: "line",
            source: "iris",
            paint: {
              "line-color": "#9d7e44",
              "line-width": 2.5,
            },
            filter: ["==", ["get", "code_iris"], ""],
          });

          // ─── Street points — adaptive : few "headline" points when zoomed
          // out, full detail when zoomed in.
          map.addLayer({
            id: "streets-dot",
            type: "circle",
            source: "streets",
            paint: {
              // Radius scales with both sales count AND zoom. Low-volume
              // streets are radius 0 (invisible) at low zoom, only top streets
              // are shown ; everything appears as user zooms in.
              "circle-radius": [
                "interpolate", ["linear"], ["zoom"],
                12, [
                  "interpolate", ["linear"], ["get", "sales"],
                  1, 0,
                  30, 0,
                  60, 7,
                  120, 12,
                  220, 18,
                ],
                13.2, [
                  "interpolate", ["linear"], ["get", "sales"],
                  1, 0,
                  15, 4,
                  50, 9,
                  120, 14,
                  220, 22,
                ],
                14.5, [
                  "interpolate", ["linear"], ["get", "sales"],
                  1, 3,
                  10, 6,
                  50, 11,
                  120, 16,
                  220, 26,
                ],
                16, [
                  "interpolate", ["linear"], ["get", "sales"],
                  1, 5,
                  10, 9,
                  50, 14,
                  120, 22,
                  220, 32,
                ],
              ],
              "circle-color": [
                "interpolate", ["linear"], ["get", "turnover_score"],
                0, "#d9e0d4",
                10, "#a8b8a3",
                25, "#e6cf9a",
                50, "#c09b5a",
                75, "#b54f3a",
                100, "#7a2810",
              ],
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": [
                "interpolate", ["linear"], ["zoom"],
                12, 1,
                14, 1.5,
                16, 2,
              ],
              "circle-opacity": 0.95,
            },
          });

          // ─── Pipeline layer : logements à fort potentiel de vente ──────────
          const pipeRes = await fetch(assetUrl("/data/saint-maur/pipeline.geojson"));
          if (pipeRes.ok) {
            const pipeline = await pipeRes.json();
            map.addSource("pipeline", { type: "geojson", data: pipeline });

            // Halo glow
            map.addLayer({
              id: "pipeline-halo",
              type: "circle",
              source: "pipeline",
              layout: { visibility: "none" },
              paint: {
                "circle-radius": [
                  "interpolate", ["linear"], ["zoom"],
                  13, 0,
                  14, 6,
                  16, 14,
                ],
                "circle-color": [
                  "interpolate", ["linear"], ["get", "proba_sale_12m"],
                  20, "#d9e0d4",
                  40, "#e6cf9a",
                  55, "#c09b5a",
                  70, "#b54f3a",
                  85, "#7a2810",
                ],
                "circle-blur": 0.7,
                "circle-opacity": 0.45,
              },
            });

            // Solid dot
            map.addLayer({
              id: "pipeline-dot",
              type: "circle",
              source: "pipeline",
              layout: { visibility: "none" },
              paint: {
                "circle-radius": [
                  "interpolate", ["linear"], ["zoom"],
                  13, [
                    "interpolate", ["linear"], ["get", "proba_sale_12m"],
                    25, 0,
                    50, 2,
                    80, 4,
                  ],
                  15, [
                    "interpolate", ["linear"], ["get", "proba_sale_12m"],
                    25, 3,
                    50, 5,
                    80, 8,
                  ],
                  17, [
                    "interpolate", ["linear"], ["get", "proba_sale_12m"],
                    25, 5,
                    50, 8,
                    80, 12,
                  ],
                ],
                "circle-color": [
                  "interpolate", ["linear"], ["get", "proba_sale_12m"],
                  20, "#d9e0d4",
                  40, "#e6cf9a",
                  55, "#c09b5a",
                  70, "#b54f3a",
                  85, "#7a2810",
                ],
                "circle-stroke-color": "#ffffff",
                "circle-stroke-width": 1,
                "circle-opacity": 1,
              },
            });

            const pipePopup = new maplibregl.Popup({
              closeButton: false,
              closeOnClick: false,
              offset: 10,
              maxWidth: "320px",
            });
            map.on("mousemove", "pipeline-dot", (e) => {
              if (!e.features?.length) return;
              map.getCanvas().style.cursor = "pointer";
              const p = (e.features[0] as MapGeoJSONFeature).properties as Record<string, unknown>;
              const addr = String(p.addr || "-");
              const dpe = String(p.etiquette_dpe || "?");
              const score = Number(p.proba_sale_12m || 0);
              const year = p.annee_construction ? String(p.annee_construction) : "-";
              const surf = p.surface ? `${p.surface} m²` : "";
              type Sig = { label: string; logit_delta?: number; weight?: number };
              let signals: Sig[] = [];
              try {
                signals = JSON.parse(String(p.signals_json || "[]"));
              } catch { /* ignore */ }
              const signalsHtml = signals.length
                ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #eaecef">
                    <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:#9b9690;margin-bottom:4px">Principaux facteurs (top 3)</div>
                    ${signals.slice(0, 3).map((s) => {
                      const d = s.logit_delta ?? (s.weight ? s.weight / 50 : 0);
                      const sign = d >= 0 ? "+" : "";
                      const col = d >= 0 ? dpeColor(dpe) : "#5a554f";
                      return `<div style="display:flex;justify-content:space-between;gap:8px;font-size:11.5px;color:#5a554f;margin:2px 0"><span>${s.label}</span><span style="color:${col};font-weight:600;font-variant-numeric:tabular-nums">${sign}${d.toFixed(2)}</span></div>`;
                    }).join("")}
                  </div>`
                : "";
              pipePopup
                .setLngLat(e.lngLat)
                .setHTML(
                  `<div style="font-family:var(--font-poppins),sans-serif;font-size:13px;line-height:1.5;color:#212529;min-width:280px;max-width:320px">
                    <div style="font-weight:600;margin-bottom:6px">${addr}</div>
                    <div style="display:flex;gap:8px;align-items:center;margin-bottom:4px">
                      <span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:4px;background:${dpeColor(dpe)};color:white;font-weight:700;font-size:12px">${dpe}</span>
                      <span style="color:#5a554f">${p.type_bati || ""} · ${year} · ${surf}</span>
                    </div>
                    <div style="display:flex;align-items:baseline;gap:8px;margin-top:6px;padding-top:6px;border-top:1px solid #eaecef">
                      <span style="font-weight:700;color:${dpeColor(dpe)};font-size:18px;font-variant-numeric:tabular-nums">${score.toFixed(1)}<span style="font-size:11px;color:#9b9690;font-weight:400"> %</span></span>
                      <span style="color:#5a554f;font-size:12px">probabilité de vente 12 mois (modèle calibré)</span>
                    </div>
                    ${signalsHtml}
                    <div style="margin-top:8px;font-size:11px;color:#9b9690">Cliquez pour ouvrir la fiche du logement</div>
                  </div>`,
                )
                .addTo(map);
            });
            map.on("mouseleave", "pipeline-dot", () => {
              map.getCanvas().style.cursor = "";
              pipePopup.remove();
            });

            // Click : ouvre la fiche en local (pas d'auto-redirect)
            map.on("click", "pipeline-dot", (e) => {
              if (!e.features?.length) return;
              const p = (e.features[0] as MapGeoJSONFeature).properties as unknown as PipelineLogement;
              onSelectPipeline(p);
              onSelectStreet(null);
              onSelectIris(null);
            });
          }

          // ─── Permits / cadastral updates layer ─────────────────────────────
          const permRes = await fetch(assetUrl("/data/saint-maur/permits.geojson"));
          if (permRes.ok) {
            const permits = await permRes.json();
            map.addSource("permits", { type: "geojson", data: permits });
            map.addLayer({
              id: "permits-dot",
              type: "circle",
              source: "permits",
              layout: { visibility: "none" },
              paint: {
                "circle-radius": [
                  "interpolate", ["linear"], ["zoom"],
                  13, 4,
                  16, 9,
                ],
                "circle-color": [
                  "interpolate", ["linear"], ["get", "year"],
                  2019, "#a8b8a3",
                  2022, "#c09b5a",
                  2025, "#b54f3a",
                  2026, "#7a2810",
                ],
                "circle-stroke-color": "#ffffff",
                "circle-stroke-width": 1.5,
                "circle-opacity": 0.9,
              },
            });
            const permPopup = new maplibregl.Popup({
              closeButton: false,
              closeOnClick: false,
              offset: 10,
              maxWidth: "260px",
            });
            map.on("mousemove", "permits-dot", (e) => {
              if (!e.features?.length) return;
              map.getCanvas().style.cursor = "pointer";
              const p = (e.features[0] as MapGeoJSONFeature).properties as Record<string, unknown>;
              permPopup
                .setLngLat(e.lngLat)
                .setHTML(
                  `<div style="font-family:var(--font-poppins),sans-serif;font-size:13px;line-height:1.5;color:#212529;min-width:180px">
                    <div style="font-weight:600;margin-bottom:4px">Activité bâti récente</div>
                    <div style="color:#5a554f">Mise à jour cadastrale : <strong>${p.updated}</strong></div>
                    <div style="color:#5a554f">${p.type_bati}</div>
                    <div style="color:#9b9690;font-size:11px;margin-top:4px">Quartier ${p.nom_iris || "?"}</div>
                  </div>`,
                )
                .addTo(map);
            });
            map.on("mouseleave", "permits-dot", () => {
              map.getCanvas().style.cursor = "";
              permPopup.remove();
            });
            map.on("click", "permits-dot", (e) => {
              if (!e.features?.length) return;
              const f = e.features[0] as MapGeoJSONFeature;
              const p = f.properties as unknown as PermitFeature;
              const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
              onSelectPermit({ ...p, lng: coords[0], lat: coords[1] });
              onSelectStreet(null);
              onSelectIris(null);
              onSelectPipeline(null);
            });
          }

          // ─── Hover popup on street dots ────────────────────────────────────
          const popup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 14,
            maxWidth: "280px",
          });
          map.on("mousemove", "streets-dot", (e) => {
            if (!e.features?.length) return;
            map.getCanvas().style.cursor = "pointer";
            const f = e.features[0] as MapGeoJSONFeature;
            const p = f.properties as unknown as StreetProps;
            const eurPerSqm = p.median_price_per_sqm
              ? `${Math.round(p.median_price_per_sqm).toLocaleString("fr-FR")} €/m²`
              : "-";
            popup
              .setLngLat(e.lngLat)
              .setHTML(
                `<div style="font-family:var(--font-poppins),sans-serif;font-size:14px;line-height:1.45;color:#212529;min-width:200px">
                  <div style="font-weight:600;font-size:15px;margin-bottom:6px;color:#212529">${formatStreet(p.street_name)}</div>
                  <div style="color:#5a554f;display:flex;justify-content:space-between;gap:14px">
                    <span>${p.sales} ventes</span>
                    <span style="color:#9d7e44;font-weight:600">${eurPerSqm}</span>
                  </div>
                  <div style="margin-top:6px;font-size:12px;color:#9b9690">Cliquez pour le détail</div>
                </div>`,
              )
              .addTo(map);
          });
          map.on("mouseleave", "streets-dot", () => {
            map.getCanvas().style.cursor = "";
            popup.remove();
          });

          // ─── Hover on IRIS polygons (when not over a dot) ──────────────────
          let hoveredIrisCode = "";
          map.on("mousemove", "iris-fill", (e) => {
            if (!e.features?.length) return;
            const f = e.features[0] as MapGeoJSONFeature;
            const code = String(f.properties?.code_iris ?? "");
            if (code !== hoveredIrisCode) {
              hoveredIrisCode = code;
              if (map.getLayer("iris-hover")) {
                map.setFilter("iris-hover", ["==", ["get", "code_iris"], code]);
              }
            }
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", "iris-fill", () => {
            hoveredIrisCode = "";
            if (map.getLayer("iris-hover")) {
              map.setFilter("iris-hover", ["==", ["get", "code_iris"], ""]);
            }
            map.getCanvas().style.cursor = "";
          });

          // ─── Click handling : street dot takes priority over IRIS ──────────
          map.on("click", (e) => {
            const dotFeats = map.queryRenderedFeatures(e.point, {
              layers: ["streets-dot"],
            });
            if (dotFeats.length > 0) {
              const f = dotFeats[0] as MapGeoJSONFeature;
              const p = f.properties as unknown as StreetProps;
              onSelectStreet(p);
              onSelectIris(null);
              const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
              map.flyTo({ center: coords, zoom: Math.max(map.getZoom(), 14.8), duration: 700 });
              return;
            }
            const irisFeats = map.queryRenderedFeatures(e.point, {
              layers: ["iris-fill"],
            });
            if (irisFeats.length > 0) {
              const f = irisFeats[0] as MapGeoJSONFeature;
              const p = f.properties as unknown as IrisProps;
              onSelectIris(p);
              onSelectStreet(null);
              return;
            }
            onSelectStreet(null);
            onSelectIris(null);
          });

          setReady(true);
        } catch (err) {
          const e = err as Error;
          console.error("[CarteMap] data load failed:", e);
          setError(`Chargement des données échoué : ${e.message}`);
        }
      });

      mapRef.current = map;
    } catch (err) {
      const e = err as Error;
      console.error("[CarteMap] init failed:", e);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(`Init carte échouée : ${e.message}`);
    }

    return () => {
      const map = mapRef.current;
      if (map) {
        const cleanup = (map as unknown as { __cleanup?: () => void }).__cleanup;
        if (cleanup) cleanup();
        map.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to filters — both layers always visible (fusion), filter only on dots
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (map.getLayer("streets-dot")) {
      // Filtre type bien : on lit la bonne propriété de comptage
      const salesField =
        filters.typeFilter === "Appartement"
          ? "sales_appt"
          : filters.typeFilter === "Maison"
          ? "sales_maison"
          : "sales";
      map.setFilter(
        "streets-dot",
        [">=", ["get", salesField], filters.minSales] as maplibregl.FilterSpecification,
      );
    }
    // Pipeline (DPE-driven probable sales) toggle
    const pipeVis = filters.showPipeline ? "visible" : "none";
    if (map.getLayer("pipeline-halo")) {
      map.setLayoutProperty("pipeline-halo", "visibility", pipeVis);
    }
    if (map.getLayer("pipeline-dot")) {
      map.setLayoutProperty("pipeline-dot", "visibility", pipeVis);
    }
    // Permits toggle
    const permVis = filters.showPermits ? "visible" : "none";
    if (map.getLayer("permits-dot")) {
      map.setLayoutProperty("permits-dot", "visibility", permVis);
    }
  }, [filters, ready]);

  // React to selected IRIS — highlight via the hover layer's filter
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (!map.getLayer("iris-hover")) return;
    map.setFilter("iris-hover", [
      "==",
      ["get", "code_iris"],
      selectedIrisCode ?? "",
    ]);
  }, [selectedIrisCode, ready]);

  // React to 3D toggle : pitch + visibility de la couche fill-extrusion
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.easeTo({
      pitch: is3d ? 55 : 0,
      bearing: is3d ? -15 : 0,
      duration: 700,
    });
    if (map.getLayer("3d-buildings")) {
      map.setLayoutProperty(
        "3d-buildings",
        "visibility",
        is3d ? "visible" : "none",
      );
    }
    // Atténuer la fill IRIS en 3D pour que les bâtiments restent lisibles
    if (map.getLayer("iris-fill")) {
      map.setPaintProperty("iris-fill", "fill-opacity", is3d ? 0.18 : 0.32);
    }
  }, [is3d, ready]);

  return (
    <>
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          background: "#f3ede3",
        }}
      />
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-red-50 border border-red-300 rounded-lg px-4 py-3 text-sm text-red-900 max-w-md shadow-lg">
          <div className="font-semibold mb-1">Carte indisponible</div>
          <div className="text-xs">{error}</div>
        </div>
      )}
    </>
  );
}
