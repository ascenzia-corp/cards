/**
 * Polices de la charte Ascenzia (gabarit D1, licence OFL) pour la page publique de la carte :
 * League Spartan (titres 600, étiquettes 500) et Inter (texte 300 / 400). Auto-hébergées.
 */
import localFont from "next/font/local";

export const leagueSpartan = localFont({
  src: "./LeagueSpartan-Variable.ttf",
  weight: "100 900",
  display: "swap",
  variable: "--font-charte-title",
});

export const inter = localFont({
  src: "./Inter-Variable.ttf",
  weight: "100 900",
  display: "swap",
  variable: "--font-charte-text",
});

export const charteFontVariables = `${leagueSpartan.variable} ${inter.variable}`;
