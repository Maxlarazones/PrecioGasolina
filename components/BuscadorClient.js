"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { FUELS } from "@/lib/fuels";
import { normalize } from "@/lib/provincias";
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

/* ---------- Autocompletar de provincia (solo acepta valores de la lista) ---------- */

function ProvinceCombobox({ provincias, text, setText, selectedId, setSelectedId, invalid }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = "bz-provincias";

  const sorted = useMemo(
    () => [...provincias].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [provincias]
  );

  const matches = useMemo(() => {
    const q = normalize(text);
    const selected = selectedId && provincias.find((p) => p.id === selectedId);
    // Vacío o ya elegida: se ofrecen todas para poder cambiar.
    if (!q || (selected && selected.nombre === text)) return sorted;
    const score = (p) => {
      const n = normalize(p.nombre);
      if (n.startsWith(q)) return 0;
      if (n.includes(q)) return 1;
      return 2;
    };
    return sorted.filter((p) => p.search.includes(q)).sort((a, b) => score(a) - score(b));
  }, [text, selectedId, provincias, sorted]);

  useEffect(() => {
    if (!open) return;
    const el = document.getElementById(`${listId}-${active}`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function select(p) {
    setText(p.nombre);
    setSelectedId(p.id);
    setOpen(false);
  }

  function onChange(e) {
    const value = e.target.value;
    setText(value);
    const exact = provincias.find((p) => normalize(p.nombre) === normalize(value));
    setSelectedId(exact ? exact.id : null);
    setActive(0);
    setOpen(true);
  }

  function onKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, Math.max(matches.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && open && matches[active]) {
      e.preventDefault();
      select(matches[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="bz-combo">
      <input
        type="text"
        role="combobox"
        aria-label="Provincia"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[active] ? `${listId}-${active}` : undefined}
        aria-invalid={invalid}
        autoComplete="off"
        spellCheck={false}
        placeholder="Escribe tu provincia (vacío = toda España)"
        value={text}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      />
      {text && (
        <button
          type="button"
          className="bz-clear"
          aria-label="Borrar provincia"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setText("");
            setSelectedId(null);
          }}
        >
          ×
        </button>
      )}
      {open && (
        <ul className="bz-list" id={listId} role="listbox">
          {matches.length === 0 && <li className="bz-option empty">Sin coincidencias</li>}
          {matches.map((p, i) => (
            <li
              key={p.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={`bz-option ${i === active ? "active" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                select(p);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <span>{p.nombre}</span>
              <small>{p.ccaa}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Página del buscador ---------- */

export default function BuscadorClient({ data, actualizado }) {
  const { provincias, stations } = data;
  const provById = useMemo(() => new Map(provincias.map((p) => [p.id, p])), [provincias]);

  // Encuadre de "toda España": unión de los encuadres de todas las provincias.
  const spainBounds = useMemo(() => {
    let s = 90, w = 180, n = -90, e = -180;
    for (const p of provincias) {
      s = Math.min(s, p.bounds[0][0]);
      w = Math.min(w, p.bounds[0][1]);
      n = Math.max(n, p.bounds[1][0]);
      e = Math.max(e, p.bounds[1][1]);
    }
    return [[s, w], [n, e]];
  }, [provincias]);

  // Lo que el usuario está editando...
  const [fuel, setFuel] = useState(DEFAULT_FUEL);
  const [text, setText] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  // ...y lo que el mapa muestra (cambia solo al pulsar Buscar).
  const [applied, setApplied] = useState({ fuel: DEFAULT_FUEL, provId: null });
  const [ready, setReady] = useState(false);
  const [panelToggled, setPanelToggled] = useState(false);
  const mapApi = useRef(null);

  // Filtros desde la URL (?provincia=madrid&combustible=diesel), validados
  // contra las listas. El mapa se monta después, ya con el encuadre correcto.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const f = FUEL_BY_KEY[q.get("combustible")] ? q.get("combustible") : DEFAULT_FUEL;
    const prov = provincias.find((p) => p.slug === q.get("provincia")) || null;
    setFuel(f);
    setApplied({ fuel: f, provId: prov ? prov.id : null });
    if (prov) {
      setText(prov.nombre);
      setSelectedId(prov.id);
    }
    setReady(true);
  }, [provincias]);

  const invalid = text.trim() !== "" && selectedId === null;
  const activeFuel = FUEL_BY_KEY[applied.fuel];

  const view = useMemo(() => {
    const fi = activeFuel.index;
    if (applied.provId) {
      const p = provById.get(applied.provId);
      const rows = p.top[applied.fuel].map((idx, i) => ({
        st: stations[idx],
        rank: i + 1,
        precio: stations[idx].p[fi],
        provNombre: p.nombre,
      }));
      return { mode: "prov", prov: p, rows, bounds: p.bounds, key: `p${p.id}-${applied.fuel}` };
    }
    const rows = provincias
      .filter((p) => p.top[applied.fuel].length > 0)
      .map((p) => {
        const st = stations[p.top[applied.fuel][0]];
        return { st, rank: null, precio: st.p[fi], provNombre: p.nombre };
      })
      .sort((a, b) => a.precio - b.precio);
    return { mode: "es", rows, bounds: spainBounds, key: `es-${applied.fuel}` };
  }, [applied, activeFuel, provById, provincias, stations, spainBounds]);

  function updateUrl(provId, fuelKey) {
    const q = new URLSearchParams();
    const p = provId ? provById.get(provId) : null;
    if (p) q.set("provincia", p.slug);
    q.set("combustible", fuelKey);
    window.history.replaceState(null, "", `${window.location.pathname}?${q.toString()}`);
  }

  function onSubmit(e) {
    e.preventDefault();
    if (invalid) return;
    setApplied({ fuel, provId: selectedId });
    updateUrl(selectedId, fuel);
    track("buscador_busqueda", {
      provincia: selectedId ? provById.get(selectedId).nombre : "España",
      combustible: fuel,
    });
  }

  function verTodaEspana() {
    setText("");
    setSelectedId(null);
    setApplied((a) => ({ ...a, provId: null }));
    updateUrl(null, applied.fuel);
  }

  function onRowClick(row) {
    mapApi.current?.openStation(row.st.id);
    // En móvil, se pliega el panel para que se vea el popup.
    if (!isDesktop()) setPanelToggled(false);
    track("buscador_ranking_click", { gasolinera: row.st.n, provincia: row.provNombre });
  }

  const title =
    view.mode === "prov"
      ? `Top ${view.rows.length} · ${activeFuel.label} · ${view.prov.nombre}`
      : `La más barata de cada provincia · ${activeFuel.label}`;

  return (
    <div className="bz-page">
      <form className="bz-bar" onSubmit={onSubmit}>
        <ProvinceCombobox
          provincias={provincias}
          text={text}
          setText={setText}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          invalid={invalid}
        />
        <select
          className="bz-fuel"
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
        <button type="submit" className="bz-btn" disabled={invalid}>
          Buscar
        </button>
      </form>

      <div className="bz-map">
        {ready ? (
          <SearchMap
            rows={view.rows}
            fuelKey={applied.fuel}
            bounds={view.bounds}
            viewKey={view.key}
            apiRef={mapApi}
            onEvent={track}
          />
        ) : (
          <div className="bz-loading">Cargando mapa…</div>
        )}

        <div className="bz-chip">
          <span className="dot" style={{ background: activeFuel.color }} />
          <span>
            {activeFuel.label}
            {view.mode === "prov" ? ` · ${view.prov.nombre}` : " · España"}
          </span>
          {view.mode === "prov" && (
            <button type="button" onClick={verTodaEspana}>
              Ver toda España
            </button>
          )}
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
                No hay gasolineras con {activeFuel.label} en {view.prov?.nombre}.
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
                        <span className="bz-row-name">
                          {view.mode === "prov" ? row.st.n : row.provNombre}
                        </span>
                        <span className="bz-row-sub">
                          {view.mode === "prov" ? row.st.m : `${row.st.n} · ${row.st.m}`}
                        </span>
                      </span>
                      <span className="bz-price">{fmt(row.precio)}</span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
            {view.mode === "prov" && view.rows.length > 0 && view.rows.length < 10 && (
              <p className="bz-note">
                Solo hay {view.rows.length} gasolineras con {activeFuel.label} en {view.prov.nombre}.
              </p>
            )}
            <p className="bz-foot">Datos: MITECO · Actualizado {formatFecha(actualizado)}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
