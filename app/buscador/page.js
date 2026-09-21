import "./buscador.css";
import BuscadorClient from "@/components/BuscadorClient";
import { fetchEstaciones } from "@/lib/miteco";
import { buildSearchData } from "@/lib/buscador";

export const metadata = {
  title: "Buscador de gasolineras más baratas por provincia",
  description:
    "Las 10 gasolineras más baratas de cada provincia de España por tipo de combustible. Datos oficiales del Ministerio para la Transición Ecológica.",
};

// Igual que el mapa de portada: se genera en el servidor y se cachea 30 min.
// El buscador filtra en el navegador sobre estos datos, sin llamadas extra.
export const revalidate = 1800;

export default async function BuscadorPage() {
  const raw = await fetchEstaciones();
  const data = buildSearchData(raw, 10);
  return <BuscadorClient data={data} actualizado={new Date().toISOString()} />;
}
