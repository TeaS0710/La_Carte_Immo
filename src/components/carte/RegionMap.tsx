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
  "75": { center: [2.3522, 48.8566], zoom: 11.5 },
  "77": { center: [3.0, 48.62], zoom: 9 },
  "78": { center: [1.85, 48.78], zoom: 9.5 },
  "91": { center: [2.30, 48.55], zoom: 9.5 },
  "92": { center: [2.22, 48.85], zoom: 11 },
  "93": { center: [2.48, 48.92], zoom: 11 },
  "94": { center: [2.48, 48.78], zoom: 10.5 },
  "95": { center: [2.20, 49.06], zoom: 9.8 },
};

export default function RegionMap({
  is3d = false,
  deptFilter,
}: {
  is3d?: boolean;
  deptFilter?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    try {
      const cfg = deptFilter && DEPT_CENTERS[deptFilter]
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
          // Filtre éventuel par département
          const geo = deptFilter
            ? {
                type: "FeatureCollection",
                features: geoRaw.features.filter(
                  (f: { properties: { code_dept?: string } }) =>
                    f.properties.code_dept === deptFilter,
                ),
              }
            : geoRaw;
          map.addSource("communes", { type: "geojson", data: geo });

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

          // Cercles communes : rayon ∝ ventes, couleur ∝ €/m²
          map.addLayer({
            id: "communes-dot",
            type: "circle",
            source: "communes",
            paint: {
              "circle-radius": [
                "interpolate", ["linear"], ["zoom"],
                8, [
                  "interpolate", ["linear"], ["get", "total_sales"],
                  100, 3, 1000, 7, 5000, 12, 15000, 18,
                ],
                11, [
                  "interpolate", ["linear"], ["get", "total_sales"],
                  100, 5, 1000, 10, 5000, 18, 15000, 26,
                ],
                14, [
                  "interpolate", ["linear"], ["get", "total_sales"],
                  100, 8, 1000, 14, 5000, 24, 15000, 34,
                ],
              ],
              "circle-color": [
                "case",
                ["==", ["get", "median_price_per_sqm"], null], "#9b9690",
                [
                  "interpolate", ["linear"], ["get", "median_price_per_sqm"],
                  3000, "#d9e0d4",
                  5000, "#a8b8a3",
                  6500, "#e6cf9a",
                  8000, "#c09b5a",
                  10000, "#b54f3a",
                  13000, "#7a2810",
                ],
              ],
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 1.5,
              "circle-opacity": 0.92,
            },
          });

          // Labels communes (zoom élevé)
          map.addLayer({
            id: "communes-label",
            type: "symbol",
            source: "communes",
            minzoom: 11,
            layout: {
              "text-field": ["get", "nom"],
              "text-font": ["Noto Sans Regular"],
              "text-size": [
                "interpolate", ["linear"], ["zoom"],
                11, 10, 14, 13,
              ],
              "text-offset": [0, 1.4],
              "text-anchor": "top",
              "text-optional": true,
              "text-allow-overlap": false,
            },
            paint: {
              "text-color": "#1a1815",
              "text-halo-color": "rgba(255,255,255,0.85)",
              "text-halo-width": 1.5,
            },
          });

          // Hover popup
          const popup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 12,
            maxWidth: "280px",
          });
          map.on("mousemove", "communes-dot", (e) => {
            if (!e.features?.length) return;
            map.getCanvas().style.cursor = "pointer";
            const p = (e.features[0] as MapGeoJSONFeature).properties as Record<string, unknown>;
            const ventes = Number(p.total_sales);
            const med = p.median_price ? Number(p.median_price) : null;
            const medSqm = p.median_price_per_sqm ? Number(p.median_price_per_sqm) : null;
            const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");
            popup
              .setLngLat(e.lngLat)
              .setHTML(
                `<div style="font-family:var(--font-poppins),sans-serif;font-size:13px;line-height:1.5;color:#212529;min-width:220px">
                  <div style="font-weight:600;font-size:14px;margin-bottom:4px">${p.nom}</div>
                  <div style="color:#5a554f;display:flex;justify-content:space-between"><span>Ventes DVF (5 ans) :</span><strong>${fmt(ventes)}</strong></div>
                  ${med ? `<div style="color:#5a554f;display:flex;justify-content:space-between"><span>Prix médian :</span><strong>${fmt(med)} €</strong></div>` : ""}
                  ${medSqm ? `<div style="color:#5a554f;display:flex;justify-content:space-between"><span>Prix au m² :</span><strong style="color:#9d7e44">${fmt(medSqm)} €/m²</strong></div>` : ""}
                  <div style="margin-top:8px;font-size:11px;color:#9d7e44;font-weight:500">Cliquer : ouvrir la carte de la ville</div>
                </div>`,
              )
              .addTo(map);
          });
          map.on("mouseleave", "communes-dot", () => {
            map.getCanvas().style.cursor = "";
            popup.remove();
          });
          map.on("click", "communes-dot", (e) => {
            if (!e.features?.length) return;
            const p = (e.features[0] as MapGeoJSONFeature).properties as Record<string, unknown>;
            router.push(assetUrl(`/carte/ville/${p.slug}`));
          });

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
