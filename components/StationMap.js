"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { FUELS } from "@/lib/fuels";

// Límites de España incluyendo Canarias, Ceuta y Melilla: el mapa no deja
// arrastrarse lejos de aquí, así el usuario no se "pierde" por el océano.
const SPAIN_LIMITS = [
  [26.5, -19.5],
  [45.0, 5.5],
];

const FUEL_BY_KEY = Object.fromEntries(FUELS.map((f) => [f.key, f]));

// Un punto por gasolinera: una "píldora" blanca con un puntito de color por
// cada combustible en el que está entre las 10 más baratas de su comunidad.
function buildIcon(top) {
  const ordered = FUELS.filter((f) => top.includes(f.key));
  const dots = ordered
    .map((f) => `<span class="dot" style="background:${f.color}"></span>`)
    .join("");
  const width = 6 + ordered.length * 12;
  return L.divIcon({
    className: "station-pin",
    html: `<div class="pill">${dots}</div>`,
    iconSize: [width, 16],
    iconAnchor: [width / 2, 8],
    popupAnchor: [0, -8],
  });
}

// Ajuste de tamaño sin animación (evita que el mapa "salte" al cargar
// o al cambiar el tamaño del iframe).
function MapSizeFix() {
  const map = useMap();
  useEffect(() => {
    const fix = () => map.invalidateSize({ pan: false });
    const t = setTimeout(fix, 100);
    window.addEventListener("resize", fix);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", fix);
    };
  }, [map]);
  return null;
}

function Legend() {
  return (
    <div className="legend">
      {FUELS.map((f) => (
        <div key={f.key} className="legend-row">
          <span className="dot" style={{ background: f.color }} />
          {f.label}
        </div>
      ))}
    </div>
  );
}

export default function StationMap({ stations }) {
  // Encuadre inicial calculado una vez, aplicado directamente al crear el
  // mapa (sin animación posterior).
  const initialBounds = useMemo(() => {
    if (!stations.length) return SPAIN_LIMITS;
    return L.latLngBounds(stations.map((s) => [s.lat, s.lng]));
  }, [stations]);

  const icons = useMemo(() => {
    const cache = {};
    for (const s of stations) {
      const k = s.top.join("|");
      if (!cache[k]) cache[k] = buildIcon(s.top);
    }
    return cache;
  }, [stations]);

  return (
    <div className="map-wrapper">
      <MapContainer
        bounds={initialBounds}
        boundsOptions={{ padding: [20, 20] }}
        maxBounds={SPAIN_LIMITS}
        maxBoundsViscosity={1.0}
        minZoom={5}
        style={{ height: "100%", width: "100%" }}
        dragging={true}
        touchZoom={true}
        doubleClickZoom={true}
        scrollWheelZoom={false}
        boxZoom={false}
        keyboard={false}
        zoomControl={true}
        fadeAnimation={false}
      >
        <MapSizeFix />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {stations.map((s) => (
          <Marker key={s.id} position={[s.lat, s.lng]} icon={icons[s.top.join("|")]}>
            <Popup>
              <strong>{s.rotulo}</strong>
              <br />
              {s.direccion}
              <br />
              {s.municipio} · {s.comunidad}
              <table className="popup-prices">
                <tbody>
                  {FUELS.map((f) => {
                    const precio = s.precios[f.key];
                    if (precio === null || precio === undefined) return null;
                    const isTop = s.top.includes(f.key);
                    return (
                      <tr key={f.key}>
                        <td>
                          <span className="dot" style={{ background: f.color }} /> {f.label}
                        </td>
                        <td style={{ fontWeight: isTop ? 700 : 400 }}>
                          {precio.toFixed(3)} €/l
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <Legend />
    </div>
  );
}
