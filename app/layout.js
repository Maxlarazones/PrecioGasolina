import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata = {
  title: "Gasolineras más baratas de España",
  description:
    "Ranking en tiempo real de las gasolineras más baratas de España, con datos oficiales del Ministerio para la Transición Ecológica.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
