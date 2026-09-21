"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { FUELS } from "@/lib/fuels";

const SPAIN_LIMITS = [
  [26.5, -19.5],
  [45.0, 5.5],
];

const fmt = (n) => n.toFixed(3).replace(".", ",") + " €/l";

// Deja hueco para el chip (arriba) y el panel de ranking (a la derecha en
// escritorio, abajo en móvil) para que los puntos no queden tapados.
function fitPadding() {
  const desktop = window.matchMedia("(min-width: 700px)").matches;
  return desktop
    ? { paddingTopLeft: [20, 56], paddingBottomRight: [330, 20] }
    : { paddingTopLeft: [20, 56], paddingBottomRight: [20, 70] };
}

function textColorFor(fuelKey) {
  return fuelKey === "diesel_premium" ? "#212121" : "#ffffff";
}

function rankIcon(color, text, rank) {
  return L.divIcon({
    className: "sm-pin",
    html: `<div class="rank-pin" style="background:${color};color:${text}">${rank}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  });
}

function dotIcon(color) {
  return L.divIcon({
    className: "sm-pin",
    html: `<div class="dot-pin" style="background:${color}"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  });
}

// Reencuadra cuando cambia la búsqueda (no en la carga inicial, que ya
// nace encuadrada) y expone openStation() para el panel de ranking.
function Controller({ bounds, viewKey, apiRef, markerRefs }) {
  const map = useMap();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    map.closePopup();
    map.fitBounds(bounds, { ...fitPadding(), animate: true, duration: 0.4 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewKey]);

  useEffect(() => {
    apiRef.current = {
      openStation(id) {
        const marker = markerRefs.current.get(id);
        if (!marker) return;
        map.setView(marker.getLatLng(), Math.max(map.getZoom(), 13), { animate: false });
        marker.openPopup();
      },
    };
  }, [map, apiRef, markerRefs]);

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

export default function SearchMap({ rows, fuelKey, bounds, viewKey, apiRef, onEvent }) {
  const markerRefs = useRef(new Map());
  const fuel = FUELS.find((f) => f.key === fuelKey);
  const initialBounds = useRef(bounds);
  const initialPadding = useMemo(() => fitPadding(), []);

  const icons = useMemo(() => {
    const byRank = {};
    for (let r = 1; r <= 10; r++) byRank[r] = rankIcon(fuel.color, textColorFor(fuelKey), r);
    return { byRank, dot: dotIcon(fuel.color) };
  }, [fuel, fuelKey]);

  return (
    <MapContainer
      bounds={initialBounds.current}
      boundsOptions={initialPadding}
      maxBounds={SPAIN_LIMITS}
      maxBoundsViscosity={1.0}
      minZoom={5}
      style={{ height: "100%", width: "100%" }}
      dragging={true}
      touchZoom={true}
      doubleClickZoom={true}
      scrollWheelZoom={true}
      wheelPxPerZoomLevel={120}
      wheelDebounceTime={80}
      boxZoom={false}
      keyboard={false}
      zoomControl={true}
      fadeAnimation={false}
    >
      <Controller bounds={bounds} viewKey={viewKey} apiRef={apiRef} markerRefs={markerRefs} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {rows.map((row) => {
        const st = row.st;
        return (
          <Marker
            key={`${viewKey}-${st.id}`}
            position={[st.la, st.lo]}
            icon={row.rank ? icons.byRank[row.rank] : icons.dot}
            ref={(m) => {
              if (m) markerRefs.current.set(st.id, m);
              else markerRefs.current.delete(st.id);
            }}
            eventHandlers={{
              popupopen: () => onEvent("buscador_popup", { gasolinera: st.n, provincia: row.provNombre }),
            }}
          >
            <Popup>
              <div className="bz-popup">
                <strong>{st.n}</strong>
                <br />
                {st.a}
                <br />
                {st.m} · {row.provNombre}
                <table>
                  <tbody>
                    {FUELS.map((f, i) => {
                      const precio = st.p[i];
                      if (precio === null || precio === undefined) return null;
                      const active = f.key === fuelKey;
                      return (
                        <tr key={f.key} className={active ? "active" : ""}>
                          <td>
                            <span className="dot" style={{ background: f.color }} /> {f.label}
                          </td>
                          <td>{fmt(precio)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <a
                  className="bz-dir"
                  href={`https://www.google.com/maps/dir/?api=1&destination=${st.la},${st.lo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onEvent("buscador_como_llegar", { gasolinera: st.n, provincia: row.provNombre })}
                >
                  Cómo llegar →
                </a>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
