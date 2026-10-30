import { describe, expect, it } from "vitest";
import { suggestSlug, validateSlug } from "@/lib/slug";

describe("slug", () => {
  it("propose prenom.nom sans accents", () => {
    expect(suggestSlug("Laurent", "Fontaine")).toBe("laurent.fontaine");
    expect(suggestSlug("Jean-Éric", "Le Gall")).toBe("jean-eric.le-gall");
    expect(suggestSlug("Chloé", "D'Arcy")).toBe("chloe.darcy");
  });

  it("valide la forme générale (F-01)", () => {
    expect(validateSlug("laurent", "personal")).toBeNull();
    expect(validateSlug("ab", "personal")).not.toBeNull();
    expect(validateSlug("Laurent", "personal")).not.toBeNull();
    expect(validateSlug("a".repeat(41), "personal")).not.toBeNull();
    expect(validateSlug("admin", "personal")).not.toBeNull();
  });

  it("impose prenom.nom pour une carte Ascenzia, homonymes en prenom.nom2", () => {
    expect(validateSlug("laurent.fontaine", "ascenzia")).toBeNull();
    expect(validateSlug("laurent.fontaine2", "ascenzia")).toBeNull();
    expect(validateSlug("laurent", "ascenzia")).not.toBeNull();
    expect(validateSlug(".fontaine", "ascenzia")).not.toBeNull();
  });
});
