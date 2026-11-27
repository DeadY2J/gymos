import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Bricolage Grotesque (OFL), alojada en el proyecto: sin dependencia de Google Fonts.
const texto = localFont({ src: "./fuentes/bricolage-grotesque-latin-opsz-normal.woff2", variable: "--font-bricolage", weight: "200 800", display: "swap" });
const cifras = localFont({ src: "./fuentes/bricolage-grotesque-latin-wdth-normal.woff2", variable: "--font-cifras", weight: "200 800", display: "swap" });

export const metadata: Metadata = {
  title: "GymOS",
  description: "QR de acceso, cuotas y radar de bajas para gimnasios.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${texto.variable} ${cifras.variable}`}>
      <body>{children}</body>
    </html>
  );
}
