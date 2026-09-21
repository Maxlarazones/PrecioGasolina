import { parseStation } from "./miteco.js";
import { PROVINCIAS, provinciaFromRaw } from "./provincias.js";
import { FUELS } from "./fuels.js";

const FUEL_KEYS = FUELS.map((f) => f.key);

const round5 = (n) => Math.round(n * 1e5) / 1e5;

// Encuadre de la provincia a partir de TODAS sus gasolineras (no solo el
// top 10), descartando el 2% más extremo por cada lado para que una
// coordenada mal cargada no descuadre el zoom.
function computeBounds(stations) {
  const lats = stations.map((s) => s.lat).sort((a, b) => a - b);
  const lngs = stations.map((s) => s.lng).sort((a, b) => a - b);
  const n = lats.length;
  const lo = n >= 20 ? Math.floor(0.02 * (n - 1)) : 0;
  const hi = n >= 20 ? Math.ceil(0.98 * (n - 1)) : n - 1;
  let s = lats[lo], nn = lats[hi], w = lngs[lo], e = lngs[hi];

  // Tamaño mínimo (~10 km) para provincias con muy pocas gasolineras.
  const MIN = 0.1;
  if (nn - s < MIN) { const c = (nn + s) / 2; s = c - MIN / 2; nn = c + MIN / 2; }
  if (e - w < MIN) { const c = (e + w) / 2; w = c - MIN / 2; e = c + MIN / 2; }

  return [[round5(s), round5(w)], [round5(nn), round5(e)]];
}

// Datos que viajan en el HTML del buscador. Formato compacto a propósito:
// - stations: gasolineras únicas. p = precios en el orden de FUELS.
// - provincias: cada una con su encuadre y, por combustible, los índices
//   (en `stations`) de sus N más baratas, ya ordenados.
export function buildSearchData(rawStations, limit = 10) {
  const groups = new Map();

  for (const raw of rawStations) {
    const prov = provinciaFromRaw(raw);
    if (!prov) continue;
    const st = parseStation(raw);
    if (!st) continue;
    if (!groups.has(prov.id)) groups.set(prov.id, []);
    groups.get(prov.id).push(st);
  }

  const stations = [];
  const indexById = new Map();

  const addStation = (st, provId) => {
    if (indexById.has(st.id)) return indexById.get(st.id);
    const idx = stations.length;
    stations.push({
      id: st.id,
      n: st.rotulo,
      a: st.direccion,
      m: st.municipio,
      pv: provId,
      la: round5(st.lat),
      lo: round5(st.lng),
      p: FUEL_KEYS.map((k) => st.precios[k]),
    });
    indexById.set(st.id, idx);
    return idx;
  };

  const provincias = [];
  for (const p of PROVINCIAS) {
    const list = groups.get(p.id);
    if (!list || list.length === 0) continue;

    const top = {};
    for (const fuel of FUEL_KEYS) {
      top[fuel] = list
        .filter((st) => st.precios[fuel] !== null)
        .sort((a, b) => a.precios[fuel] - b.precios[fuel])
        .slice(0, limit)
        .map((st) => addStation(st, p.id));
    }

    provincias.push({
      id: p.id,
      nombre: p.nombre,
      ccaa: p.ccaa,
      slug: p.slug,
      search: p.search,
      bounds: computeBounds(list),
      top,
    });
  }

  return { provincias, stations };
}

// Diagnóstico con datos reales: cómo llega cada provincia de MITECO
// (código + texto) y a qué provincia la asignamos.
export function buildProvinciaDebug(rawStations) {
  const map = new Map();
  let sinProvincia = 0;
  for (const raw of rawStations) {
    const key = `${raw["IDProvincia"]}|${raw["Provincia"]}`;
    const prov = provinciaFromRaw(raw);
    if (!prov) sinProvincia++;
    if (!map.has(key)) {
      map.set(key, {
        IDProvincia: raw["IDProvincia"],
        Provincia: raw["Provincia"],
        asignadaA: prov ? prov.nombre : null,
        estaciones: 0,
      });
    }
    map.get(key).estaciones++;
  }
  const filas = Array.from(map.values()).sort((a, b) =>
    String(a.IDProvincia).localeCompare(String(b.IDProvincia))
  );
  return {
    totalEstaciones: rawStations.length,
    sinProvincia,
    provinciasDistintas: filas.length,
    filas,
  };
}
