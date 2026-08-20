import type { Metadata } from "next";
import { Amiri, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const amiri = Amiri({
  subsets: ["latin", "arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Ottawa Majlis — classical texts, read closely",
    template: "%s — Ottawa Majlis",
  },
  description:
    "Ottawa Majlis runs small programs where a classical text is read closely and argued with. See what is running and register your interest.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${amiri.variable} ${plexSans.variable} ${plexMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
