// Las 52 provincias (incluye Ceuta y Melilla) con su código INE, que es el
// mismo que MITECO envía en el campo IDProvincia.
//
// - alias: palabras extra que el usuario puede escribir en el buscador
//   (capitales, islas, nombres en otras lenguas, grafías antiguas).
// - match: fragmentos para reconocer el texto del campo "Provincia" de
//   MITECO (p. ej. "CORUÑA (A)", "BALEARS (ILLES)", "PALMAS (LAS)").

export function normalize(str) {
  return (str || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const RAW = [
  [1, "Araba/Álava", "País Vasco", ["alava", "araba", "vitoria", "gasteiz"], ["alava", "araba"]],
  [2, "Albacete", "Castilla-La Mancha", [], ["albacete"]],
  [3, "Alicante/Alacant", "Comunitat Valenciana", ["alicante", "alacant", "benidorm", "elche"], ["alicante", "alacant"]],
  [4, "Almería", "Andalucía", [], ["almeria"]],
  [5, "Ávila", "Castilla y León", [], ["avila"]],
  [6, "Badajoz", "Extremadura", ["merida"], ["badajoz"]],
  [7, "Illes Balears", "Illes Balears", ["baleares", "mallorca", "menorca", "ibiza", "eivissa", "formentera", "palma"], ["balear"]],
  [8, "Barcelona", "Cataluña", [], ["barcelona"]],
  [9, "Burgos", "Castilla y León", [], ["burgos"]],
  [10, "Cáceres", "Extremadura", [], ["caceres"]],
  [11, "Cádiz", "Andalucía", ["jerez", "algeciras"], ["cadiz"]],
  [12, "Castellón/Castelló", "Comunitat Valenciana", ["castellon", "castello"], ["castellon", "castello"]],
  [13, "Ciudad Real", "Castilla-La Mancha", [], ["ciudad real"]],
  [14, "Córdoba", "Andalucía", [], ["cordoba"]],
  [15, "A Coruña", "Galicia", ["coruna", "la coruna", "santiago", "ferrol"], ["coruna"]],
  [16, "Cuenca", "Castilla-La Mancha", [], ["cuenca"]],
  [17, "Girona", "Cataluña", ["gerona"], ["girona", "gerona"]],
  [18, "Granada", "Andalucía", [], ["granada"]],
  [19, "Guadalajara", "Castilla-La Mancha", [], ["guadalajara"]],
  [20, "Gipuzkoa", "País Vasco", ["guipuzcoa", "donostia", "san sebastian"], ["gipuzkoa", "guipuzcoa"]],
  [21, "Huelva", "Andalucía", [], ["huelva"]],
  [22, "Huesca", "Aragón", [], ["huesca"]],
  [23, "Jaén", "Andalucía", [], ["jaen"]],
  [24, "León", "Castilla y León", ["ponferrada"], ["leon"]],
  [25, "Lleida", "Cataluña", ["lerida"], ["lleida", "lerida"]],
  [26, "La Rioja", "La Rioja", ["logrono", "rioja"], ["rioja"]],
  [27, "Lugo", "Galicia", [], ["lugo"]],
  [28, "Madrid", "Madrid", [], ["madrid"]],
  [29, "Málaga", "Andalucía", ["marbella"], ["malaga"]],
  [30, "Murcia", "Murcia", ["cartagena"], ["murcia"]],
  [31, "Navarra", "Navarra", ["pamplona", "iruna", "nafarroa"], ["navarra"]],
  [32, "Ourense", "Galicia", ["orense"], ["ourense", "orense"]],
  [33, "Asturias", "Asturias", ["oviedo", "gijon"], ["asturias"]],
  [34, "Palencia", "Castilla y León", [], ["palencia"]],
  [35, "Las Palmas", "Canarias", ["gran canaria", "lanzarote", "fuerteventura"], ["palmas"]],
  [36, "Pontevedra", "Galicia", ["vigo"], ["pontevedra"]],
  [37, "Salamanca", "Castilla y León", [], ["salamanca"]],
  [38, "Santa Cruz de Tenerife", "Canarias", ["tenerife", "la palma", "la gomera", "el hierro"], ["tenerife"]],
  [39, "Cantabria", "Cantabria", ["santander"], ["cantabria"]],
  [40, "Segovia", "Castilla y León", [], ["segovia"]],
  [41, "Sevilla", "Andalucía", [], ["sevilla"]],
  [42, "Soria", "Castilla y León", [], ["soria"]],
  [43, "Tarragona", "Cataluña", ["reus"], ["tarragona"]],
  [44, "Teruel", "Aragón", [], ["teruel"]],
  [45, "Toledo", "Castilla-La Mancha", ["talavera"], ["toledo"]],
  [46, "Valencia/València", "Comunitat Valenciana", [], ["valencia"]],
  [47, "Valladolid", "Castilla y León", [], ["valladolid"]],
  [48, "Bizkaia", "País Vasco", ["vizcaya", "bilbao"], ["bizkaia", "vizcaya"]],
  [49, "Zamora", "Castilla y León", [], ["zamora"]],
  [50, "Zaragoza", "Aragón", [], ["zaragoza"]],
  [51, "Ceuta", "Ceuta", [], ["ceuta"]],
  [52, "Melilla", "Melilla", [], ["melilla"]],
];

// Otras formas de llamar a cada comunidad: si el usuario escribe su
// comunidad, el autocompletar le ofrece todas sus provincias.
const CCAA_ALIAS = {
  "Comunitat Valenciana": ["comunidad valenciana"],
  "Cataluña": ["catalunya"],
  "País Vasco": ["euskadi"],
  "Illes Balears": ["baleares"],
  "Castilla y León": ["castilla leon"],
  "Castilla-La Mancha": ["castilla la mancha"],
  "Murcia": ["region de murcia"],
  "Madrid": ["comunidad de madrid"],
  "Asturias": ["principado de asturias"],
};

function slugify(str) {
  return normalize(str).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export const PROVINCIAS = RAW.map(([id, nombre, ccaa, alias, match]) => ({
  id,
  nombre,
  ccaa,
  slug: slugify(nombre),
  // Texto normalizado en el que busca el autocompletar.
  search: normalize([nombre, ccaa, ...alias, ...(CCAA_ALIAS[ccaa] || [])].join(" | ")),
  match,
}));

const BY_ID = new Map(PROVINCIAS.map((p) => [p.id, p]));

// Provincia de una estación cruda de MITECO. Primero por código oficial,
// comprobando que el texto encaja; si no, solo por texto.
export function provinciaFromRaw(rawStation) {
  const texto = normalize(rawStation["Provincia"]);
  const id = parseInt(String(rawStation["IDProvincia"] ?? "").trim(), 10);
  const byId = BY_ID.get(id);
  if (byId && byId.match.some((k) => texto.includes(k))) return byId;
  return PROVINCIAS.find((p) => p.match.some((k) => texto.includes(k))) || null;
}
