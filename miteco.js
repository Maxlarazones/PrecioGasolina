// Fuente oficial: Ministerio para la Transición Ecológica (MITECO)
// Datos públicos y gratuitos de precios de carburantes en España.
// Docs / endpoint base:
// https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres

const MITECO_URL =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";

// Mapa de combustibles soportados -> nombre exacto del campo en la API
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

function parseDecimalEs(value) {
  if (!value) return null;
  const n = parseFloat(String(value).replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalize(str) {
  return (str || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Descarga el listado completo de estaciones de España.
// Next.js cachea esta petición 30 min (revalidate) para no golpear
// la API del Ministerio en cada request de usuario.
export async function fetchEstaciones() {
  const res = await fetch(MITECO_URL, {
    next: { revalidate: 1800 },
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`MITECO respondió ${res.status}`);
  }

  const data = await res.json();
  return Array.isArray(data.ListaEESSPrecio) ? data.ListaEESSPrecio : [];
}

// Filtra, parsea y ordena las estaciones para un combustible/ciudad dados.
export function buildRanking(rawStations, { fuel, city, limit = 10 }) {
  const field = FUEL_FIELDS[fuel];
  if (!field) throw new Error(`Combustible no soportado: ${fuel}`);

  const cityNorm = city ? normalize(city) : null;

  const parsed = rawStations
    .map((s) => {
      const precio = parseDecimalEs(s[field]);
      const lat = parseDecimalEs(s["Latitud"]);
      const lng = parseDecimalEs(s["Longitud (WGS84)"]);
      if (precio === null || lat === null || lng === null) return null;

      return {
        id: s["IDEESS"],
        rotulo: s["Rótulo"] || "Estación sin nombre",
        direccion: s["Dirección"] || "",
        localidad: s["Localidad"] || "",
        municipio: s["Municipio"] || "",
        provincia: s["Provincia"] || "",
        cp: s["C.P."] || "",
        horario: s["Horario"] || "",
        precio,
        lat,
        lng,
      };
    })
    .filter(Boolean);

  const filtered = cityNorm
    ? parsed.filter(
        (s) =>
          normalize(s.municipio).includes(cityNorm) ||
          normalize(s.localidad).includes(cityNorm) ||
          normalize(s.provincia).includes(cityNorm)
      )
    : parsed;

  filtered.sort((a, b) => a.precio - b.precio);

  return filtered.slice(0, limit);
}
