// Fuente oficial: Ministerio para la Transición Ecológica (MITECO)
// Datos públicos y gratuitos de precios de carburantes en España.
// https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres

const MITECO_URL =
  process.env.MITECO_URL ||
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";

export const FUEL_FIELDS = {
  "95": "Precio Gasolina 95 E5",
  "98": "Precio Gasolina 98 E5",
  diesel: "Precio Gasoleo A",
  diesel_premium: "Precio Gasoleo Premium",
};

export const FUEL_LABELS = {
  "95": "Gasolina 95",
  "98": "Gasolina 98",
  diesel: "Diésel",
  diesel_premium: "Diésel Premium",
};

export const CCAA_LIST = [
  "Andalucía",
  "Aragón",
  "Asturias",
  "Illes Balears",
  "Canarias",
  "Cantabria",
  "Castilla y León",
  "Castilla-La Mancha",
  "Cataluña",
  "Ceuta",
  "Comunitat Valenciana",
  "Extremadura",
  "Galicia",
  "Madrid",
  "Melilla",
  "Murcia",
  "Navarra",
  "País Vasco",
  "La Rioja",
];

// Código oficial de comunidad autónoma (INE) tal como lo reporta MITECO
// en el campo IDCCAA. Vía principal de clasificación: es numérica y no
// depende del formato de texto que use la API para el nombre de provincia.
const IDCCAA_MAP = {
  "1": "Andalucía",
  "2": "Aragón",
  "3": "Asturias",
  "4": "Illes Balears",
  "5": "Canarias",
  "6": "Cantabria",
  "7": "Castilla y León",
  "8": "Castilla-La Mancha",
  "9": "Cataluña",
  "10": "Comunitat Valenciana",
  "11": "Extremadura",
  "12": "Galicia",
  "13": "Madrid",
  "14": "Murcia",
  "15": "Navarra",
  "16": "País Vasco",
  "17": "La Rioja",
  "18": "Ceuta",
  "19": "Melilla",
};

// Vía de respaldo (si IDCCAA viene vacío/raro): nombre de provincia por
// coincidencia de palabra clave normalizada.
const PROVINCIA_KEYWORDS = [
  ["Andalucía", ["almeria", "cadiz", "cordoba", "granada", "huelva", "jaen", "malaga", "sevilla"]],
  ["Aragón", ["huesca", "teruel", "zaragoza"]],
  ["Asturias", ["asturias"]],
  ["Illes Balears", ["balear"]],
  ["Canarias", ["palmas", "tenerife"]],
  ["Cantabria", ["cantabria"]],
  [
    "Castilla y León",
    ["avila", "burgos", "leon", "palencia", "salamanca", "segovia", "soria", "valladolid", "zamora"],
  ],
  ["Castilla-La Mancha", ["albacete", "ciudad real", "cuenca", "guadalajara", "toledo"]],
  ["Cataluña", ["barcelona", "girona", "lleida", "tarragona"]],
  ["Ceuta", ["ceuta"]],
  ["Comunitat Valenciana", ["alicante", "alacant", "castellon", "castello", "valencia"]],
  ["Extremadura", ["badajoz", "caceres"]],
  ["Galicia", ["coruna", "lugo", "ourense", "pontevedra"]],
  ["Madrid", ["madrid"]],
  ["Melilla", ["melilla"]],
  ["Murcia", ["murcia"]],
  ["Navarra", ["navarra"]],
  ["País Vasco", ["araba", "alava", "bizkaia", "vizcaya", "gipuzkoa", "guipuzcoa"]],
  ["La Rioja", ["rioja"]],
];

function normalize(str) {
  return (str || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getComunidad(rawStation) {
  const idRaw = rawStation["IDCCAA"];
  if (idRaw !== undefined && idRaw !== null && String(idRaw).trim() !== "") {
    const idNum = parseInt(String(idRaw).trim(), 10);
    if (Number.isFinite(idNum) && IDCCAA_MAP[String(idNum)]) {
      return IDCCAA_MAP[String(idNum)];
    }
  }

  const n = normalize(rawStation["Provincia"]);
  for (const [comunidad, keywords] of PROVINCIA_KEYWORDS) {
    if (keywords.some((k) => n.includes(k))) return comunidad;
  }
  return "Otras";
}

function parseDecimalEs(value) {
  if (!value) return null;
  const n = parseFloat(String(value).replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Coordenadas: a diferencia de los precios, pueden ser NEGATIVAS (toda la
// España al oeste de Greenwich tiene longitud negativa). Solo se validan
// contra un rango que cubre Península, Baleares, Canarias, Ceuta y Melilla.
function parseCoord(value, min, max) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const n = parseFloat(String(value).replace(",", "."));
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

export async function fetchEstaciones() {
  const res = await fetch(MITECO_URL, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) throw new Error(`MITECO respondió ${res.status}`);

  const data = await res.json();
  return Array.isArray(data.ListaEESSPrecio) ? data.ListaEESSPrecio : [];
}

export function parseStation(s) {
  const lat = parseCoord(s["Latitud"], 27, 44.5);
  const lng = parseCoord(s["Longitud (WGS84)"], -18.5, 4.5);
  if (lat === null || lng === null) return null;

  const precios = {};
  for (const [key, field] of Object.entries(FUEL_FIELDS)) {
    precios[key] = parseDecimalEs(s[field]);
  }

  return {
    id: s["IDEESS"],
    rotulo: s["Rótulo"] || "Estación sin nombre",
    direccion: s["Dirección"] || "",
    localidad: s["Localidad"] || "",
    municipio: s["Municipio"] || "",
    provincia: s["Provincia"] || "",
    comunidad: getComunidad(s),
    cp: s["C.P."] || "",
    horario: s["Horario"] || "",
    precios,
    lat,
    lng,
  };
}

export function buildRanking(rawStations, { fuel, city, limit = 10 }) {
  if (!FUEL_FIELDS[fuel]) throw new Error(`Combustible no soportado: ${fuel}`);
  const cityNorm = city ? normalize(city) : null;

  const parsed = rawStations.map(parseStation).filter((s) => s && s.precios[fuel] !== null);

  const filtered = cityNorm
    ? parsed.filter(
        (s) =>
          normalize(s.municipio).includes(cityNorm) ||
          normalize(s.localidad).includes(cityNorm) ||
          normalize(s.provincia).includes(cityNorm)
      )
    : parsed;

  filtered.sort((a, b) => a.precios[fuel] - b.precios[fuel]);

  return filtered.slice(0, limit).map((s) => ({ ...s, precio: s.precios[fuel] }));
}

export function buildRegionalRanking(rawStations, { fuel, limit = 10 }) {
  if (!FUEL_FIELDS[fuel]) throw new Error(`Combustible no soportado: ${fuel}`);

  const parsed = rawStations
    .map(parseStation)
    .filter((s) => s && s.precios[fuel] !== null && s.comunidad !== "Otras");

  const byComunidad = new Map();
  for (const s of parsed) {
    if (!byComunidad.has(s.comunidad)) byComunidad.set(s.comunidad, []);
    byComunidad.get(s.comunidad).push(s);
  }

  return CCAA_LIST.filter((c) => byComunidad.has(c)).map((comunidad) => {
    const list = byComunidad.get(comunidad);
    list.sort((a, b) => a.precios[fuel] - b.precios[fuel]);
    return {
      comunidad,
      resultados: list.slice(0, limit).map((s) => ({ ...s, precio: s.precios[fuel] })),
    };
  });
}

// Diagnóstico: cuenta cuántas estaciones cayeron en cada comunidad
// (incluida "Otras", que es la que no se pudo clasificar) y da una
// muestra de crudos sin clasificar para poder ajustar el mapeo con
// datos reales en vez de a ciegas.
export function buildDebugInfo(rawStations) {
  const counts = {};
  const sinClasificarSample = [];

  for (const s of rawStations) {
    const comunidad = getComunidad(s);
    counts[comunidad] = (counts[comunidad] || 0) + 1;
    if (comunidad === "Otras" && sinClasificarSample.length < 15) {
      sinClasificarSample.push({
        Provincia: s["Provincia"],
        IDCCAA: s["IDCCAA"],
        Municipio: s["Municipio"],
      });
    }
  }

  return {
    totalEstaciones: rawStations.length,
    clavesDeLaPrimeraEstacion: rawStations[0] ? Object.keys(rawStations[0]) : [],
    conteoPorComunidad: counts,
    muestraSinClasificar: sinClasificarSample,
  };
}

// Datos listos para el mapa: una entrada por gasolinera, con la lista de
// combustibles en los que está entre las N más baratas de su comunidad.
// Solo los campos que usa el mapa, para que el HTML pese poco.
export function buildMapData(rawStations, limit = 10) {
  const byId = new Map();

  for (const fuel of Object.keys(FUEL_FIELDS)) {
    const regional = buildRegionalRanking(rawStations, { fuel, limit });
    for (const { resultados } of regional) {
      for (const s of resultados) {
        if (!byId.has(s.id)) {
          byId.set(s.id, {
            id: s.id,
            rotulo: s.rotulo,
            direccion: s.direccion,
            municipio: s.municipio,
            comunidad: s.comunidad,
            lat: s.lat,
            lng: s.lng,
            precios: s.precios,
            top: [],
          });
        }
        byId.get(s.id).top.push(fuel);
      }
    }
  }

  return Array.from(byId.values());
}
