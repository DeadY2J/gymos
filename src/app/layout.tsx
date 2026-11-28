import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { connection } from "next/server";
import "./globals.css";

// Tipografías OFL alojadas en el proyecto (sin Google Fonts):
// Big Shoulders Display, condensada y de pizarra deportiva, para cifras y títulos; Archivo (eje de anchura) para el texto.
const marcador = localFont({ src: "./fuentes/big-shoulders-display-latin-wght-normal.woff2", variable: "--font-marcador", weight: "100 900", display: "swap" });
const texto = localFont({ src: "./fuentes/archivo-latin-wdth-normal.woff2", variable: "--font-texto", weight: "100 900", display: "swap" });

export const metadata: Metadata = {
  title: "GymOS",
  description: "QR de acceso, cuotas y radar de bajas para gimnasios.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#2a2d30" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Render dinámico: la CSP lleva un nonce nuevo en cada petición (ver src/proxy.ts).
  await connection();
  return (
    <html lang="es" className={`${marcador.variable} ${texto.variable}`}>
      <body>{children}</body>
    </html>
  );
}
