"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import maplibregl, { Map, MapGeoJSONFeature } from "maplibre-gl";
import { assetUrl } from "@/lib/url";

/**
 * Carte interactive à l'échelle Île-de-France ou département.
 * Chaque commune analysée = un marker dont la taille reflète le volume
 * de ventes DVF et la couleur le prix médian au m². Hover = popup,
 * clic = navigation vers /carte/ville/{slug}.
 *
 * Si `deptFilter` est passé (ex: "94"), seules les communes du dept
 * sont affichées et la carte zoome automatiquement sur leur emprise.
 */

// Centres approximatifs par département (pour pré-zoom)
const DEPT_CENTERS: Record<string, { center: [number, number]; zoom: number }> = {
  "75": { center: [2.3522, 48.8566], zoom: 12 },
  "77": { center: [3.0, 48.62], zoom: 9 },
  "78": { center: [1.85, 48.78], zoom: 9.5 },
  "91": { center: [2.30, 48.55], zoom: 9.5 },
  "92": { center: [2.22, 48.85], zoom: 11 },
  "93": { center: [2.48, 48.92], zoom: 11 },
  "94": { center: [2.48, 48.78], zoom: 10.5 },
  "95": { center: [2.20, 49.06], zoom: 9.8 },
};

// Filtre spécial Paris : tous les arrondissements 75101-75120
function matchesParisArr(p: Record<string, unknown>): boolean {
  const code = String(p.code_insee || "");
  return code.startsWith("751") && code.length === 5;
}

export default function RegionMap({
  is3d = false,
  deptFilter,
  showGPE = false,
}: {
  is3d?: boolean;
  deptFilter?: string;
  /** Affiche le calque des futures gares Grand Paris Express */
  showGPE?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    try {
      const cfg = deptFilter === "paris-arr"
        ? { center: [2.3522, 48.8566] as [number, number], zoom: 11.8 }
        : deptFilter && DEPT_CENTERS[deptFilter]
        ? DEPT_CENTERS[deptFilter]
        : { center: [2.4, 48.86] as [number, number], zoom: 9.2 };
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: "https://tiles.openfreemap.org/styles/positron",
        center: cfg.center,
        zoom: cfg.zoom,
        pitch: 0,
        attributionControl: { compact: true },
      });

      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false, showZoom: true }),
        "top-right",
      );

      map.on("mouseout", () => {
        const root = map.getContainer();
        root.querySelectorAll(".maplibregl-popup").forEach((el) => el.remove());
      });

      const resizeMap = () => { try { map.resize(); } catch { /* destroyed */ } };
      requestAnimationFrame(resizeMap);
      setTimeout(resizeMap, 100);
      setTimeout(resizeMap, 500);
      window.addEventListener("resize", resizeMap);
      const ro = new ResizeObserver(resizeMap);
      ro.observe(containerRef.current);
      (map as unknown as { __cleanup?: () => void }).__cleanup = () => {
        window.removeEventListener("resize", resizeMap);
        ro.disconnect();
      };

      map.on("load", async () => {
        try {
          const res = await fetch(assetUrl("/data/idf/communes_map.geojson"));
          if (!res.ok) throw new Error("Carte régionale non générée");
          const geoRaw = await res.json();
          // Filtre éventuel par département (ou Paris arrondissements spécial)
          const geo = deptFilter === "paris-arr"
            ? {
                type: "FeatureCollection",
                features: geoRaw.features.filter(
                  (f: { properties: Record<string, unknown> }) =>
                    matchesParisArr(f.properties),
                ),
              }
            : deptFilter
            ? {
                type: "FeatureCollection",
                features: geoRaw.features.filter(
                  (f: { properties: { code_dept?: string } }) =>
                    f.properties.code_dept === deptFilter,
                ),
              }
            : geoRaw;
          map.addSource("communes", { type: "geojson", data: geo });

          // ─── Choroplèthe FULL : polygones semi-transparents pour les
          // communes traitées intégralement (équivalent grille IRIS mais
          // à l'échelle régionale). Source séparée (only full communes).
          try {
            const choroRes = await fetch(assetUrl("/data/idf/communes_full_choro.geojson"));
            if (choroRes.ok) {
              const choroRaw = await choroRes.json();
              const choroFiltered = deptFilter === "paris-arr"
                ? {
                    type: "FeatureCollection",
                    features: choroRaw.features.filter((f: { properties: Record<string, unknown> }) =>
                      matchesParisArr(f.properties),
                    ),
                  }
                : deptFilter
                ? {
                    type: "FeatureCollection",
                    features: choroRaw.features.filter((f: { properties: { code_dept?: string } }) =>
                      f.properties.code_dept === deptFilter,
                    ),
                  }
                : choroRaw;
              map.addSource("communes-choro", { type: "geojson", data: choroFiltered });

              // Fill semi-transparent coloré par prix €/m² (palette IRIS-like)
              map.addLayer({
                id: "communes-fill",
                type: "fill",
                source: "communes-choro",
                paint: {
                  "fill-color": [
                    "case",
                    ["==", ["get", "median_price_per_sqm"], null], "#9b9690",
                    [
                      "interpolate", ["linear"],
                      ["coalesce", ["get", "median_price_per_sqm"], 0],
                      3000, "#d9e0d4",
                      5000, "#a8b8a3",
                      6500, "#e6cf9a",
                      8000, "#c09b5a",
                      10000, "#b54f3a",
                      13000, "#7a2810",
                    ],
                  ],
                  "fill-opacity": 0.42,
                },
              });
              // Contours fins
              map.addLayer({
                id: "communes-outline",
                type: "line",
                source: "communes-choro",
                paint: {
                  "line-color": "rgba(33,37,41,0.35)",
                  "line-width": 0.8,
                },
              });
              // Hover : surbrillance + ombrage plus saturé
              map.addLayer({
                id: "communes-hover",
                type: "line",
                source: "communes-choro",
                paint: {
                  "line-color": "#9d7e44",
                  "line-width": 2.8,
                },
                filter: ["==", ["get", "code_insee"], ""],
              });
              // Labels nom commune (zoom élevé)
              map.addLayer({
                id: "communes-label",
                type: "symbol",
                source: "communes-choro",
                minzoom: 10,
                layout: {
                  "text-field": ["get", "nom"],
                  "text-font": ["Noto Sans Regular"],
                  "text-size": [
                    "interpolate", ["linear"], ["zoom"],
                    10, 10, 13, 13, 15, 15,
                  ],
                  "text-anchor": "center",
                  "text-allow-overlap": false,
                  "text-optional": true,
                },
                paint: {
                  "text-color": "#1a1815",
                  "text-halo-color": "rgba(255,255,255,0.92)",
                  "text-halo-width": 1.5,
                },
              });
            }
          } catch {
            /* choro optionnel */
          }

          // 3D buildings (visible quand pitch activé)
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

          // Représentation = uniquement le choroplèthe polygones
          // (heatmap + cercles + ancien layer labels retirés sur demande
          // client). Seules les communes traitées entièrement sont affichées.
          // Le label sur le polygone est géré par communes-label dans le
          // bloc "communes-choro" plus haut.

          // ─── Hover popup : utilise queryRenderedFeatures sur tout le
          // canvas, pas juste sur le layer dots. Comme ça la heatmap
          // déclenche aussi le popup quand on survole sa zone.
          const popup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 12,
            maxWidth: "280px",
          });
          const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");
          const renderPopupHTML = (p: Record<string, unknown>): string => {
            const ventes = Number(p.total_sales);
            const med = p.median_price ? Number(p.median_price) : null;
            const medSqm = p.median_price_per_sqm ? Number(p.median_price_per_sqm) : null;
            const pop = p.population ? Number(p.population) : null;
            return `<div style="font-family:var(--font-poppins),sans-serif;font-size:13px;line-height:1.5;color:#212529;min-width:240px">
              <div style="font-weight:600;font-size:14px;margin-bottom:6px;color:#1a1815">${p.nom}</div>
              ${pop ? `<div style="color:#5a554f;display:flex;justify-content:space-between"><span>Population :</span><strong>${fmt(pop)} hab.</strong></div>` : ""}
              <div style="color:#5a554f;display:flex;justify-content:space-between"><span>Ventes DVF (5 ans) :</span><strong>${fmt(ventes)}</strong></div>
              ${med ? `<div style="color:#5a554f;display:flex;justify-content:space-between"><span>Prix médian :</span><strong>${fmt(med)} €</strong></div>` : ""}
              ${medSqm ? `<div style="color:#5a554f;display:flex;justify-content:space-between"><span>Prix au m² :</span><strong style="color:#9d7e44">${fmt(medSqm)} €/m²</strong></div>` : ""}
              <div style="margin-top:8px;font-size:11px;color:#9d7e44;font-weight:500">↗ Cliquer pour ouvrir la carte détaillée</div>
            </div>`;
          };

          // Hover : queryRenderedFeatures direct sur le point du curseur
          // (polygones — pas besoin de rayon de capture, on est forcément
          // dedans ou pas)
          let lastHover = "";
          map.on("mousemove", (e) => {
            const feats = map.queryRenderedFeatures(e.point, {
              layers: ["communes-fill"],
            });
            if (feats.length > 0) {
              map.getCanvas().style.cursor = "pointer";
              const p = (feats[0] as MapGeoJSONFeature).properties as Record<string, unknown>;
              const code = String(p.code_insee || "");
              if (code !== lastHover) {
                lastHover = code;
                if (map.getLayer("communes-hover")) {
                  map.setFilter("communes-hover", ["==", ["get", "code_insee"], code]);
                }
              }
              popup
                .setLngLat(e.lngLat)
                .setHTML(renderPopupHTML(p))
                .addTo(map);
            } else {
              if (lastHover !== "") {
                lastHover = "";
                if (map.getLayer("communes-hover")) {
                  map.setFilter("communes-hover", ["==", ["get", "code_insee"], ""]);
                }
              }
              map.getCanvas().style.cursor = "";
              popup.remove();
            }
          });

          map.on("click", (e) => {
            const feats = map.queryRenderedFeatures(e.point, {
              layers: ["communes-fill"],
            });
            if (feats.length > 0) {
              const p = (feats[0] as MapGeoJSONFeature).properties as Record<string, unknown>;
              if (p.slug) {
                router.push(`/carte/ville/${p.slug}`);
              }
            }
          });

          // ─── Calque GPE (gares futures Grand Paris Express) ─────────────
          try {
            const gpeRes = await fetch(assetUrl("/data/idf/gpe_stations.json"));
            if (gpeRes.ok) {
              const gpeGeo = await gpeRes.json();
              map.addSource("gpe", { type: "geojson", data: gpeGeo });
              map.addLayer({
                id: "gpe-dot",
                type: "circle",
                source: "gpe",
                layout: { visibility: "none" },
                paint: {
                  "circle-radius": 6,
                  "circle-color": "#9d7e44",
                  "circle-stroke-color": "#ffffff",
                  "circle-stroke-width": 2,
                  "circle-opacity": 0.95,
                },
              });
              map.addLayer({
                id: "gpe-label",
                type: "symbol",
                source: "gpe",
                layout: {
                  visibility: "none",
                  "text-field": ["concat", ["get", "name"], "  •  L", ["get", "ligne"]],
                  "text-font": ["Noto Sans Regular"],
                  "text-size": 11,
                  "text-offset": [0, 1.1],
                  "text-anchor": "top",
                  "text-allow-overlap": false,
                  "text-optional": true,
                },
                paint: {
                  "text-color": "#5a554f",
                  "text-halo-color": "rgba(255,255,255,0.92)",
                  "text-halo-width": 1.5,
                },
              });
              const gpePopup = new maplibregl.Popup({
                closeButton: false,
                closeOnClick: false,
                offset: 12,
                maxWidth: "260px",
              });
              map.on("mousemove", "gpe-dot", (e) => {
                if (!e.features?.length) return;
                map.getCanvas().style.cursor = "pointer";
                const p = (e.features[0] as MapGeoJSONFeature).properties as Record<string, unknown>;
                gpePopup.setLngLat(e.lngLat).setHTML(
                  `<div style="font-family:var(--font-poppins),sans-serif;font-size:13px;line-height:1.5;color:#212529;min-width:200px">
                    <div style="font-weight:600;color:#9d7e44;margin-bottom:4px">${p.name}</div>
                    <div style="color:#5a554f">Ligne <strong>${p.ligne}</strong></div>
                    <div style="color:#9b9690;font-size:11px">Mise en service : ${p.ouverture}</div>
                    <div style="margin-top:6px;font-size:11px;color:#5a554f;font-style:italic">Source : Société des Grands Projets</div>
                  </div>`,
                ).addTo(map);
              });
              map.on("mouseleave", "gpe-dot", () => {
                map.getCanvas().style.cursor = "";
                gpePopup.remove();
              });
            }
          } catch {
            /* GPE optional */
          }

          setReady(true);
        } catch (err) {
          const e = err as Error;
          setError(e.message);
        }
      });

      mapRef.current = map;
    } catch (err) {
      const e = err as Error;
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

  // React to 3D toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.easeTo({ pitch: is3d ? 55 : 0, bearing: is3d ? -15 : 0, duration: 700 });
    if (map.getLayer("3d-buildings")) {
      map.setLayoutProperty("3d-buildings", "visibility", is3d ? "visible" : "none");
    }
  }, [is3d, ready]);

  // React to GPE toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const vis = showGPE ? "visible" : "none";
    if (map.getLayer("gpe-dot")) map.setLayoutProperty("gpe-dot", "visibility", vis);
    if (map.getLayer("gpe-label")) map.setLayoutProperty("gpe-label", "visibility", vis);
  }, [showGPE, ready]);

  return (
    <>
      <div
        ref={containerRef}
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
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
