"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { FUELS } from "@/lib/fuels";
import { track } from "@/lib/track";

const SearchMap = dynamic(() => import("@/components/SearchMap"), {
  ssr: false,
  loading: () => <div className="bz-loading">Cargando mapa…</div>,
});

const FUEL_BY_KEY = Object.fromEntries(FUELS.map((f, i) => [f.key, { ...f, index: i }]));
const DEFAULT_FUEL = "95";
const fmt = (n) => n.toFixed(3).replace(".", ",") + " €/l";

function isDesktop() {
  return window.matchMedia("(min-width: 700px)").matches;
}

function formatFecha(iso) {
  // Zona horaria fija: el servidor (UTC) y el navegador generan el mismo
  // texto, sin errores de hidratación.
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/* ---------- Página del buscador ---------- */

export default function BuscadorClient({ data, actualizado }) {
  const { provincias, stations } = data;
  const provById = useMemo(() => new Map(provincias.map((p) => [p.id, p])), [provincias]);
  const provsOrdenadas = useMemo(
    () => [...provincias].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [provincias]
  );

  // Lo que el usuario está eligiendo en el formulario...
  const [fuel, setFuel] = useState(DEFAULT_FUEL);
  const [provId, setProvId] = useState(null);
  // ...y la búsqueda ya lanzada. null = todavía no se pulsó "Buscar": no se
  // monta el mapa ni el panel, solo el hueco vacío (mismo alto -> sin CLS).
  const [applied, setApplied] = useState(null);
  const [panelToggled, setPanelToggled] = useState(false);
  const mapApi = useRef(null);

  // Filtros desde la URL (?provincia=madrid&combustible=diesel): si vienen
  // completos y válidos, precargan el formulario y lanzan la búsqueda ya
  // encuadrada. Si no, se queda en el estado inicial (formulario vacío).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const f = FUEL_BY_KEY[q.get("combustible")] ? q.get("combustible") : DEFAULT_FUEL;
    const prov = provincias.find((p) => p.slug === q.get("provincia")) || null;
    setFuel(f);
    if (prov) {
      setProvId(prov.id);
      setApplied({ fuel: f, provId: prov.id });
    }
  }, [provincias]);

  const activeFuel = applied ? FUEL_BY_KEY[applied.fuel] : FUEL_BY_KEY[fuel];

  const view = useMemo(() => {
    if (!applied) return null;
    const fi = FUEL_BY_KEY[applied.fuel].index;
    const p = provById.get(applied.provId);
    if (!p) return null;
    const rows = p.top[applied.fuel].map((idx, i) => ({
      st: stations[idx],
      rank: i + 1,
      precio: stations[idx].p[fi],
      provNombre: p.nombre,
    }));
    return { prov: p, rows, bounds: p.bounds, key: `p${p.id}-${applied.fuel}` };
  }, [applied, provById, stations]);

  function updateUrl(pid, fuelKey) {
    const q = new URLSearchParams();
    const p = pid ? provById.get(pid) : null;
    if (p) q.set("provincia", p.slug);
    q.set("combustible", fuelKey);
    window.history.replaceState(null, "", `${window.location.pathname}?${q.toString()}`);
  }

  function onSubmit(e) {
    e.preventDefault();
    if (!provId) return;
    setApplied({ fuel, provId });
    setPanelToggled(false);
    updateUrl(provId, fuel);
    track("buscador_busqueda", { provincia: provById.get(provId).nombre, combustible: fuel });
  }

  function onRowClick(row) {
    mapApi.current?.openStation(row.st.id);
    // En móvil, se pliega el panel para que se vea el popup.
    if (!isDesktop()) setPanelToggled(false);
    track("buscador_ranking_click", { gasolinera: row.st.n, provincia: row.provNombre });
  }

  const title = view && `Top ${view.rows.length} · ${activeFuel.label} · ${view.prov.nombre}`;

  return (
    <div className="bz-page">
      <form className="bz-bar" onSubmit={onSubmit}>
        <select
          className="bz-select"
          aria-label="Provincia"
          value={provId ?? ""}
          onChange={(e) => setProvId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Elige tu provincia</option>
          {provsOrdenadas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
        <select
          className="bz-select bz-fuel"
          aria-label="Tipo de combustible"
          value={fuel}
          onChange={(e) => setFuel(e.target.value)}
        >
          {FUELS.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
        <button type="submit" className="bz-btn" disabled={!provId}>
          Buscar
        </button>
      </form>

      <div className="bz-map">
        {!view ? (
          <div className="bz-empty">
            <p>Elige combustible y provincia, y pulsa Buscar.</p>
            <p className="bz-empty-sub">Verás las 10 gasolineras más baratas en el mapa.</p>
          </div>
        ) : (
          <>
            <SearchMap
              rows={view.rows}
              fuelKey={applied.fuel}
              bounds={view.bounds}
              viewKey={view.key}
              apiRef={mapApi}
              onEvent={track}
            />

            <div className="bz-chip">
              <span className="dot" style={{ background: activeFuel.color }} />
              <span>
                {activeFuel.label} · {view.prov.nombre}
              </span>
            </div>

            <aside className={`bz-panel ${panelToggled ? "toggled" : ""}`}>
              <button
                type="button"
                className="bz-panel-header"
                aria-controls="bz-panel-body"
                onClick={() => setPanelToggled((t) => !t)}
              >
                <span>
                  {title}
                  {view.rows[0] && <small>Desde {fmt(view.rows[0].precio)}</small>}
                </span>
                <span className="bz-chev" aria-hidden="true">▾</span>
              </button>

              <div className="bz-panel-body" id="bz-panel-body">
                {view.rows.length === 0 ? (
                  <p className="bz-note">
                    No hay gasolineras con {activeFuel.label} en {view.prov.nombre}.
                  </p>
                ) : (
                  <ol className="bz-rows">
                    {view.rows.map((row, i) => (
                      <li key={`${view.key}-${row.st.id}`}>
                        <button type="button" className="bz-row" onClick={() => onRowClick(row)}>
                          <span
                            className="bz-rank"
                            style={{
                              background: activeFuel.color,
                              color: applied.fuel === "diesel_premium" ? "#212121" : "#fff",
                            }}
                          >
                            {i + 1}
                          </span>
                          <span>
                            <span className="bz-row-name">{row.st.n}</span>
                            <span className="bz-row-sub">{row.st.m}</span>
                          </span>
                          <span className="bz-price">{fmt(row.precio)}</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
                {view.rows.length > 0 && view.rows.length < 10 && (
                  <p className="bz-note">
                    Solo hay {view.rows.length} gasolineras con {activeFuel.label} en {view.prov.nombre}.
                  </p>
                )}
                <p className="bz-foot">Datos: MITECO · Actualizado {formatFecha(actualizado)}</p>
              </div>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
