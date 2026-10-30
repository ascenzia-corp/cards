/**
 * Thèmes définis en code (section 10). Une seule source alimente la page, l'image Open Graph
 * et le pass Wallet, pour que les trois supports restent cohérents.
 */
import { WCAG_AA, contrastRatio, isHexColor, mix, readableOn, toPassRgb } from "./color";
import type { CardKind } from "./slug";

export const THEME_IDS = ["ascenzia", "ink", "gradient", "photo"] as const;
export type ThemeId = (typeof THEME_IDS)[number];
export const PERSONAL_THEME_IDS = ["ink", "gradient", "photo"] as const;

/** Charte Ascenzia 2026 */
export const BRAND = {
  navy900: "#1a202c",
  navy700: "#2d3748",
  navy950: "#11151d",
  gold: "#ddac63",
  fg: "#ededf2",
  fgMuted: "#a8aebc",
} as const;

/** Accent par défaut des cartes perso : le gold Ascenzia. */
export const DEFAULT_ACCENT = BRAND.gold;
const INK_BG = "#14171d";

export const THEME_LABELS: Record<ThemeId, string> = {
  ascenzia: "Ascenzia (charte 2026, verrouillé)",
  ink: "Ink : fond sombre uni",
  gradient: "Dégradé dérivé de l'accent",
  photo: "Photo de fond avec voile sombre",
};

export interface ThemeInput {
  kind: CardKind;
  themeId: string | null | undefined;
  accentColor: string | null | undefined;
  /** URL de l'image de fond (thème photo) */
  backgroundUrl?: string | null;
}

export interface ResolvedTheme {
  id: ThemeId;
  /** Fond CSS de la carte (couleur, dégradé ou image + voile) */
  cardBackground: string;
  /** Couleurs de fond réelles sur lesquelles le texte doit contraster (toutes les teintes du fond) */
  contrastSurfaces: string[];
  text: string;
  muted: string;
  /** Couleur de la fonction sur la carte */
  highlight: string;
  /** Bouton principal « Enregistrer le contact » */
  buttonBg: string;
  buttonFg: string;
  /** Ombre portée du texte (thème photo uniquement) */
  textShadow?: string;
  /** Logo Ascenzia de la charte affiché sur la carte */
  brandLogo: boolean;
  /** Polices de la charte (League Spartan, Poppins, Open Sans) */
  brandFonts: boolean;
  pass: { backgroundColor: string; foregroundColor: string; labelColor: string };
}

/** Thème effectif : une carte Ascenzia ignore tout thème ou accent fourni (F-06, F-33). */
export function effectiveThemeId(kind: CardKind, themeId: string | null | undefined): ThemeId {
  if (kind === "ascenzia") return "ascenzia";
  return (PERSONAL_THEME_IDS as readonly string[]).includes(themeId ?? "")
    ? (themeId as ThemeId)
    : "ink";
}

function effectiveAccent(kind: CardKind, accent: string | null | undefined): string {
  if (kind === "ascenzia") return BRAND.gold;
  return accent && isHexColor(accent) ? accent.toLowerCase() : DEFAULT_ACCENT;
}

function gradientStops(accent: string): [string, string] {
  return [mix(accent, "#000000", 0.62), mix(accent, "#000000", 0.82)];
}

export function resolveTheme(input: ThemeInput): ResolvedTheme {
  const id = effectiveThemeId(input.kind, input.themeId);
  const accent = effectiveAccent(input.kind, input.accentColor);
  // Noir pur ou blanc : garantit au moins 4,58:1 sur n'importe quel accent
  const button = { buttonBg: accent, buttonFg: readableOn(accent, "#000000", "#ffffff") };

  switch (id) {
    case "ascenzia":
      return {
        id,
        cardBackground: `linear-gradient(135deg, ${BRAND.navy900} 0%, ${BRAND.navy700} 100%)`,
        contrastSurfaces: [BRAND.navy900, BRAND.navy700],
        text: BRAND.fg,
        muted: BRAND.fgMuted,
        highlight: BRAND.gold,
        buttonBg: BRAND.gold,
        buttonFg: BRAND.navy900,
        brandLogo: true,
        brandFonts: true,
        pass: {
          backgroundColor: toPassRgb(BRAND.navy900),
          foregroundColor: toPassRgb(BRAND.fg),
          labelColor: toPassRgb(BRAND.gold),
        },
      };
    case "ink":
      return {
        id,
        cardBackground: INK_BG,
        contrastSurfaces: [INK_BG],
        text: "#ededf2",
        muted: "#a0a3ac",
        highlight: accent,
        ...button,
        brandLogo: false,
        brandFonts: false,
        pass: {
          backgroundColor: toPassRgb(INK_BG),
          foregroundColor: toPassRgb("#ededf2"),
          labelColor: toPassRgb(contrastRatio(accent, INK_BG) >= WCAG_AA ? accent : "#a0a3ac"),
        },
      };
    case "gradient": {
      const [from, to] = gradientStops(accent);
      const highlight = mix(accent, "#ffffff", 0.7);
      return {
        id,
        cardBackground: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
        contrastSurfaces: [from, to],
        text: "#ffffff",
        muted: "#f4f4f6",
        highlight,
        ...button,
        brandLogo: false,
        brandFonts: false,
        pass: {
          backgroundColor: toPassRgb(from),
          foregroundColor: toPassRgb("#ffffff"),
          labelColor: toPassRgb(highlight),
        },
      };
    }
    case "photo": {
      const veil = "linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4))";
      const image = input.backgroundUrl ? `, url("${input.backgroundUrl}") center / cover` : "";
      return {
        id,
        cardBackground: `${veil}${image}, ${INK_BG}`,
        // Le contraste réel dépend de l'image : on contrôle sur le fond de repli,
        // le voile de 40 % et l'ombre portée assurent la lisibilité sur l'image.
        contrastSurfaces: [INK_BG],
        text: "#ffffff",
        muted: "#f4f4f6",
        highlight: "#ffffff",
        textShadow: "0 1px 3px rgba(0,0,0,0.6)",
        ...button,
        brandLogo: false,
        brandFonts: false,
        pass: {
          backgroundColor: toPassRgb(INK_BG),
          foregroundColor: toPassRgb("#ffffff"),
          labelColor: toPassRgb("#d4d5da"),
        },
      };
    }
  }
}

/** Contrôle du contraste 4,5:1 (F-06). Retourne la liste des problèmes ; vide = conforme. */
export function contrastIssues(theme: ResolvedTheme): string[] {
  const issues: string[] = [];
  const pairs: [string, string][] = [
    ["Texte", theme.text],
    ["Texte secondaire", theme.muted],
    ["Fonction (accent)", theme.highlight],
  ];
  for (const surface of theme.contrastSurfaces) {
    for (const [label, color] of pairs) {
      const ratio = contrastRatio(color, surface);
      if (ratio < WCAG_AA)
        issues.push(`${label} ${color} sur ${surface} : contraste ${ratio.toFixed(2)}:1 < 4,5:1`);
    }
  }
  const buttonRatio = contrastRatio(theme.buttonFg, theme.buttonBg);
  if (buttonRatio < WCAG_AA)
    issues.push(`Bouton principal : contraste ${buttonRatio.toFixed(2)}:1 < 4,5:1`);
  return issues;
}

/** Validation d'un réglage de thème avant enregistrement (refus côté serveur si non conforme). */
export function validateThemeSettings(input: ThemeInput): string[] {
  const errors: string[] = [];
  if (input.kind === "personal") {
    if (input.themeId && !(PERSONAL_THEME_IDS as readonly string[]).includes(input.themeId))
      errors.push(`Thème inconnu pour une carte perso : ${input.themeId}`);
    if (input.accentColor && !isHexColor(input.accentColor))
      errors.push("La couleur d'accent doit être au format #rrggbb.");
  }
  if (errors.length) return errors;
  return contrastIssues(resolveTheme(input));
}
