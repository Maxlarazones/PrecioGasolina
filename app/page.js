import "./buscador/buscador.css";
import BuscadorClient from "@/components/BuscadorClient";
import { fetchEstaciones } from "@/lib/miteco";
import { buildSearchData } from "@/lib/buscador";

export const metadata = {
  title: "Buscador de gasolineras más baratas por provincia",
  description:
    "Las 10 gasolineras más baratas de cada provincia de España por tipo de combustible. Datos oficiales del Ministerio para la Transición Ecológica.",
};

// La raíz es el buscador (es lo que se embebe en la noticia).
// El mapa antiguo por comunidades sigue disponible en /mapa.
export const revalidate = 1800;

export default async function Home() {
  const raw = await fetchEstaciones();
  const data = buildSearchData(raw, 10);
  return <BuscadorClient data={data} actualizado={new Date().toISOString()} />;
}
