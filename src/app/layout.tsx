import type { Metadata } from "next";
import { Fraunces, Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  axes: ["opsz"],
});

const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex",
});

export const metadata: Metadata = {
  title: "Interactivision — Estudio de pintura & arte digital",
  description:
    "Sala virtual de Interactivision: seis obras que se pintan en vivo en tu pantalla. Óleo, pigmento y materia generativa.",
  openGraph: {
    title: "Interactivision — Estudio de pintura & arte digital",
    description: "Una galería que se pinta sola: obra generativa en vivo.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body
        className={`${fraunces.variable} ${instrument.variable} ${plexMono.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
