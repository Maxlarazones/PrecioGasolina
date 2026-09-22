import MapClient from "@/components/MapClient";
import { fetchEstaciones, buildMapData } from "@/lib/miteco";

// La página se genera en el servidor y se cachea 30 minutos (ISR).
// El usuario recibe el HTML con los puntos ya calculados: no hay espera
// de carga de datos en el navegador. Si MITECO falla al regenerar,
// Vercel sigue sirviendo la última versión buena.
export const revalidate = 1800;

export default async function MapaPage() {
  const raw = await fetchEstaciones();
  const stations = buildMapData(raw, 10);
  return <MapClient stations={stations} />;
}
