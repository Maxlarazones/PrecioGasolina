"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";

const StationMap = dynamic(() => import("../components/StationMap"), {
  ssr: false,
  loading: () => <div className="map-wrapper">Cargando mapa…</div>,
});

const FUEL_OPTIONS = [
  { value: "95", label: "Gasolina 95" },
  { value: "98", label: "Gasolina 98" },
  { value: "diesel", label: "Diésel" },
  { value: "diesel_premium", label: "Diésel Premium" },
];

export default function Home() {
  const [fuel, setFuel] = useState("95");
  const [city, setCity] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const search = useCallback(async (fuelValue, cityValue) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ combustible: fuelValue, limit: "10" });
      if (cityValue) params.set("ciudad", cityValue);

      const res = await fetch(`/api/precios?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Error desconocido");
      setData(json);
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga inicial: top 10 nacional de Gasolina 95
  useEffect(() => {
    search(fuel, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    search(fuel, city);
  }

  return (
    <main className="container">
      <h1>⛽ Gasolineras más baratas de España</h1>
      <p className="subtitle">
        Datos oficiales del Ministerio para la Transición Ecológica, actualizados
        varias veces al día.
      </p>

      <form className="filters" onSubmit={handleSubmit}>
        <select value={fuel} onChange={(e) => setFuel(e.target.value)}>
          {FUEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Ciudad o provincia (opcional)"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Buscando…" : "Buscar"}
        </button>
      </form>

      {error && <p className="status error">⚠️ {error}</p>}
      {data && !error && (
        <p className="status">
          {data.total} resultados
          {data.ciudad ? ` en "${data.ciudad}"` : " en toda España"} · actualizado{" "}
          {new Date(data.actualizado).toLocaleString("es-ES")}
        </p>
      )}

      {data && data.resultados.length > 0 && (
        <>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Estación</th>
                <th>Dirección</th>
                <th>Precio</th>
              </tr>
            </thead>
            <tbody>
              {data.resultados.map((s, i) => (
                <tr key={s.id}>
                  <td>{i + 1}</td>
                  <td>{s.rotulo}</td>
                  <td>
                    {s.direccion}, {s.municipio} ({s.provincia})
                  </td>
                  <td className="precio">{s.precio.toFixed(3)} €/l</td>
                </tr>
              ))}
            </tbody>
          </table>

          <StationMap stations={data.resultados} />
        </>
      )}

      {data && data.resultados.length === 0 && !loading && (
        <p className="status">No se encontraron estaciones para esa búsqueda.</p>
      )}

      <footer>
        Fuente: Geoportal de Precios de Carburantes, Ministerio para la
        Transición Ecológica (MITECO). Dato público oficial.
      </footer>
    </main>
  );
}
