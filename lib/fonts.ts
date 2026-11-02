/**
 * Polices de la charte pour le thème ascenzia (section 10) : auto-hébergées par next/font,
 * sous-ensemble latin, 3 fichiers, font-display swap. Pas de préchargement : une carte perso
 * (police système) ne télécharge aucune police.
 */
import { League_Spartan, Open_Sans, Poppins } from "next/font/google";

export const leagueSpartan = League_Spartan({
  subsets: ["latin"],
  weight: ["600"],
  display: "swap",
  preload: false,
  variable: "--font-league-spartan",
});

export const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600"],
  display: "swap",
  preload: false,
  variable: "--font-poppins",
});

export const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  preload: false,
  variable: "--font-open-sans",
});

export const brandFontVariables = `${leagueSpartan.variable} ${poppins.variable} ${openSans.variable}`;
