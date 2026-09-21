"use client";

import dynamic from "next/dynamic";

// Leaflet necesita `window`, así que el mapa solo se monta en el navegador.
const StationMap = dynamic(() => import("@/components/StationMap"), {
  ssr: false,
  loading: () => <div className="map-full-loading">Cargando mapa…</div>,
});

export default function MapClient({ stations }) {
  return (
    <div className="map-page">
      <StationMap stations={stations} />
    </div>
  );
}
