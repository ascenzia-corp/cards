import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/color";
import {
  BRAND,
  THEME_IDS,
  contrastIssues,
  effectiveThemeId,
  resolveTheme,
  validateThemeSettings,
} from "@/lib/themes";

describe("contraste WCAG", () => {
  it("calcule les ratios de référence", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 1);
  });
});

describe("thèmes", () => {
  it("chaque thème par défaut passe le contraste 4,5:1", () => {
    for (const id of THEME_IDS) {
      const kind = id === "ascenzia" ? "ascenzia" : "personal";
      const theme = resolveTheme({ kind, themeId: id, accentColor: null });
      expect(contrastIssues(theme), id).toEqual([]);
    }
  });

  it("rejette un accent non conforme sur le thème ink", () => {
    const errors = validateThemeSettings({
      kind: "personal",
      themeId: "ink",
      accentColor: "#1a202c",
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join(" ")).toMatch(/4,5:1/);
  });

  it("accepte un accent conforme", () => {
    expect(
      validateThemeSettings({ kind: "personal", themeId: "ink", accentColor: "#52bec0" }),
    ).toEqual([]);
    expect(
      validateThemeSettings({ kind: "personal", themeId: "gradient", accentColor: "#ffffff" }),
    ).toEqual([]);
  });

  it("rejette un format de couleur ou un thème inconnu", () => {
    expect(
      validateThemeSettings({ kind: "personal", themeId: "ink", accentColor: "red" }),
    ).not.toEqual([]);
    expect(
      validateThemeSettings({ kind: "personal", themeId: "ascenzia", accentColor: null }),
    ).not.toEqual([]);
  });

  it("une carte Ascenzia ignore tout thème ou accent fourni", () => {
    expect(effectiveThemeId("ascenzia", "gradient")).toBe("ascenzia");
    const theme = resolveTheme({ kind: "ascenzia", themeId: "photo", accentColor: "#ff00ff" });
    expect(theme.id).toBe("ascenzia");
    expect(theme.buttonBg).toBe(BRAND.gold);
    expect(theme.brandLogo).toBe(true);
    expect(
      validateThemeSettings({ kind: "ascenzia", themeId: "photo", accentColor: "#1a202c" }),
    ).toEqual([]);
  });

  it("dérive les couleurs du pass au format rgb()", () => {
    const theme = resolveTheme({ kind: "personal", themeId: "gradient", accentColor: "#52bec0" });
    expect(theme.pass.backgroundColor).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
  });
});

describe("dégradé", () => {
  it("reste conforme quel que soit l'accent (balayage)", () => {
    for (let i = 0; i < 4096; i += 37) {
      const hex =
        "#" +
        [i >> 8, (i >> 4) & 15, i & 15].map((v) => (v * 17).toString(16).padStart(2, "0")).join("");
      expect(
        validateThemeSettings({ kind: "personal", themeId: "gradient", accentColor: hex }),
        hex,
      ).toEqual([]);
    }
  });
});
