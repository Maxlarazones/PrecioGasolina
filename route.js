import { NextResponse } from "next/server";
import { fetchEstaciones, buildRanking, FUEL_FIELDS } from "@/lib/miteco";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const fuel = searchParams.get("combustible") || "95";
  const city = searchParams.get("ciudad") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 50);

  if (!FUEL_FIELDS[fuel]) {
    return NextResponse.json(
      { error: `Combustible no soportado. Usa: ${Object.keys(FUEL_FIELDS).join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const estaciones = await fetchEstaciones();
    const ranking = buildRanking(estaciones, { fuel, city, limit });

    return NextResponse.json({
      combustible: fuel,
      ciudad: city || null,
      total: ranking.length,
      actualizado: new Date().toISOString(),
      resultados: ranking,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "No se pudo obtener el precio de carburantes ahora mismo.", detalle: err.message },
      { status: 502 }
    );
  }
}
