import type { Metadata } from "next";
import localFont from "next/font/local";
import { connection } from "next/server";
import "./globals.css";

// Bricolage Grotesque (OFL), alojada en el proyecto: sin dependencia de Google Fonts.
const texto = localFont({ src: "./fuentes/bricolage-grotesque-latin-opsz-normal.woff2", variable: "--font-bricolage", weight: "200 800", display: "swap" });
const cifras = localFont({ src: "./fuentes/bricolage-grotesque-latin-wdth-normal.woff2", variable: "--font-cifras", weight: "200 800", display: "swap" });

export const metadata: Metadata = {
  title: "GymOS",
  description: "QR de acceso, cuotas y radar de bajas para gimnasios.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Render dinámico: la CSP lleva un nonce nuevo en cada petición (ver src/proxy.ts).
  await connection();
  return (
    <html lang="es" className={`${texto.variable} ${cifras.variable}`}>
      <body>{children}</body>
    </html>
  );
}
