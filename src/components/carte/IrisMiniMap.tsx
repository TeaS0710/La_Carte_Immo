"use client";

import { useEffect, useMemo, useState } from "react";
import { communeDataUrl } from "@/lib/url";

type Ring = number[][];
type Geometry =
  | { type: "Polygon"; coordinates: Ring[] }
  | { type: "MultiPolygon"; coordinates: Ring[][] };

interface Feature {
  type: "Feature";
  properties: { code_iris: string; nom_iris?: string };
  geometry: Geometry;
}

interface IrisGeojson {
  type: "FeatureCollection";
  features: Feature[];
}

/**
 * Mini-carte SVG du quartier IRIS dans son contexte communal — affichée
 * uniquement à l'impression (PDF brandé). Le quartier sélectionné est mis
 * en évidence (brand), les autres IRIS de la commune en gris léger pour
 * resituer.
 *
 * Pas d'appel réseau externe : utilise iris.geojson déjà packagé.
 */
export default function IrisMiniMap({
  codeInsee,
  codeIris,
}: {
  codeInsee: string;
  codeIris: string;
}) {
  const [geo, setGeo] = useState<IrisGeojson | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(communeDataUrl(codeInsee, "iris.geojson"))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: IrisGeojson) => {
        if (!cancelled) setGeo(data);
      })
      .catch(() => {
        if (!cancelled) setGeo(null);
      });
    return () => {
      cancelled = true;
    };
  }, [codeInsee]);

  const view = useMemo(() => {
    if (!geo) return null;
    // Bbox de la commune entière
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
    for (const f of geo.features) {
      forEachRing(f.geometry, (ring) => {
        for (const [lng, lat] of ring) {
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        }
      });
    }
    if (!isFinite(minLng)) return null;
    const padX = (maxLng - minLng) * 0.04;
    const padY = (maxLat - minLat) * 0.04;
    minLng -= padX; maxLng += padX; minLat -= padY; maxLat += padY;
    // viewBox 600 x 360 (~5:3 paysage A4 ok)
    const W = 600, H = 360;
    const sx = W / (maxLng - minLng);
    const sy = H / (maxLat - minLat);
    const s = Math.min(sx, sy);
    const offX = (W - (maxLng - minLng) * s) / 2;
    const offY = (H - (maxLat - minLat) * s) / 2;
    const project = ([lng, lat]: number[]): [number, number] => [
      offX + (lng - minLng) * s,
      H - (offY + (lat - minLat) * s), // flip Y
    ];
    return { W, H, project };
  }, [geo]);

  if (!geo || !view) return null;

  const target = geo.features.find((f) => f.properties.code_iris === codeIris);

  return (
    <figure className="hidden print:block print:mt-3 print:mb-2">
      <svg
        viewBox={`0 0 ${view.W} ${view.H}`}
        className="w-full h-auto border border-black/20 rounded"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background fill */}
        <rect width={view.W} height={view.H} fill="#FAF7F2" />
        {/* Autres IRIS de la commune en gris léger */}
        {geo.features.map((f) =>
          f.properties.code_iris === codeIris ? null : (
            <PolygonPath
              key={f.properties.code_iris}
              geometry={f.geometry}
              project={view.project}
              fill="#F3EFE8"
              stroke="#D9D3C8"
              strokeWidth={0.6}
            />
          ),
        )}
        {/* IRIS cible (brand) */}
        {target && (
          <PolygonPath
            geometry={target.geometry}
            project={view.project}
            fill="rgba(157,126,68,0.45)"
            stroke="#5C4A2B"
            strokeWidth={1.6}
          />
        )}
      </svg>
      <figcaption className="text-[10.5px] text-black/70 mt-1 print:leading-snug">
        Quartier <strong className="text-black">{target?.properties.nom_iris ?? codeIris}</strong>{" "}
        situé dans la commune (les autres quartiers IRIS sont représentés en gris clair pour
        resituer).
      </figcaption>
    </figure>
  );
}

function forEachRing(g: Geometry, cb: (ring: number[][]) => void) {
  if (g.type === "Polygon") {
    g.coordinates.forEach(cb);
  } else {
    g.coordinates.forEach((poly) => poly.forEach(cb));
  }
}

function PolygonPath({
  geometry,
  project,
  fill,
  stroke,
  strokeWidth,
}: {
  geometry: Geometry;
  project: (c: number[]) => [number, number];
  fill: string;
  stroke: string;
  strokeWidth: number;
}) {
  const rings: number[][][] =
    geometry.type === "Polygon"
      ? geometry.coordinates
      : geometry.coordinates.flat();
  const d = rings
    .map((ring) =>
      ring
        .map(project)
        .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
        .join(" ") + " Z",
    )
    .join(" ");
  return <path d={d} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
}
