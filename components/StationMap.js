"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

// Fix del icono por defecto de Leaflet (roto en bundlers tipo Next/Webpack)
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const SPAIN_CENTER = [40.4168, -3.7038];

export default function StationMap({ stations }) {
  const center =
    stations.length > 0
      ? [stations[0].lat, stations[0].lng]
      : SPAIN_CENTER;

  const zoom = stations.length > 0 ? 6 : 5;

  return (
    <div className="map-wrapper">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {stations.map((s) => (
          <Marker key={s.id} position={[s.lat, s.lng]} icon={icon}>
            <Popup>
              <strong>{s.rotulo}</strong>
              <br />
              {s.direccion}, {s.municipio}
              <br />
              <span style={{ color: "#1e7d32", fontWeight: 700 }}>
                {s.precio.toFixed(3)} €/l
              </span>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
