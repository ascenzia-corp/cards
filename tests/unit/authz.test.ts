import { describe, expect, it } from "vitest";
import {
  ForbiddenError,
  ValidationError,
  applyCardUpdate,
  assertMediaAllowed,
  canAccessCard,
  effectiveRole,
  isSignInAllowed,
  type Actor,
  type CardRef,
} from "@/lib/authz";
import { cardUpdateSchema } from "@/lib/card-schema";

const admin: Actor = { id: "u-admin", email: "laurent.fontaine@ascenzia.fr", role: "admin" };
const member: Actor = { id: "u-member", email: "jean.dupont@ascenzia.fr", role: "member" };
const other: Actor = { id: "u-other", email: "marie.martin@ascenzia.fr", role: "member" };

const ascenziaCard: CardRef = {
  id: "c1",
  userId: member.id,
  kind: "ascenzia",
  slug: "jean.dupont",
  themeId: "ascenzia",
  accentColor: null,
};
const personalCard: CardRef = {
  id: "c2",
  userId: admin.id,
  kind: "personal",
  slug: "laurent",
  themeId: "ink",
  accentColor: "#ddac63",
};

const input = (extra: Record<string, unknown> = {}) =>
  cardUpdateSchema.parse({ firstName: "Jean", lastName: "Dupont", ...extra });

describe("accès aux cartes", () => {
  it("un membre ne lit ni n'écrit une carte qui n'est pas la sienne", () => {
    expect(canAccessCard(member, ascenziaCard)).toBe(true);
    expect(canAccessCard(other, ascenziaCard)).toBe(false);
    expect(() => applyCardUpdate(other, ascenziaCard, input())).toThrow(ForbiddenError);
  });

  it("un admin accède à toutes les cartes", () => {
    expect(canAccessCard(admin, ascenziaCard)).toBe(true);
    expect(() => applyCardUpdate(admin, ascenziaCard, input())).not.toThrow();
  });
});

describe("verrous d'une carte Ascenzia (R-09)", () => {
  for (const actor of [admin, member]) {
    it(`refuse le changement de thème (${actor.role})`, () => {
      expect(() => applyCardUpdate(actor, ascenziaCard, input({ themeId: "ink" }))).toThrow(
        ForbiddenError,
      );
    });
    it(`refuse le changement de slug (${actor.role})`, () => {
      expect(() => applyCardUpdate(actor, ascenziaCard, input({ slug: "jean.dupont2" }))).toThrow(
        ForbiddenError,
      );
    });
    it(`refuse une couleur d'accent (${actor.role})`, () => {
      expect(() => applyCardUpdate(actor, ascenziaCard, input({ accentColor: "#ff0000" }))).toThrow(
        ForbiddenError,
      );
    });
  }

  it("force la société à Ascenzia et le thème à ascenzia", () => {
    const { values } = applyCardUpdate(
      member,
      ascenziaCard,
      input({ company: "Autre", themeId: "ascenzia" }),
    );
    expect(values.company).toBe("Ascenzia");
    expect(values.themeId).toBe("ascenzia");
    expect(values.accentColor).toBeNull();
  });

  it("refuse logo et fond", () => {
    expect(() => assertMediaAllowed(ascenziaCard, "logo")).toThrow(ForbiddenError);
    expect(() => assertMediaAllowed(ascenziaCard, "background")).toThrow(ForbiddenError);
    expect(() => assertMediaAllowed(ascenziaCard, "photo")).not.toThrow();
    expect(() => assertMediaAllowed(personalCard, "logo")).not.toThrow();
  });
});

describe("carte perso", () => {
  it("refuse un accent au contraste insuffisant", () => {
    expect(() => applyCardUpdate(admin, personalCard, input({ accentColor: "#1a202c" }))).toThrow(
      ValidationError,
    );
  });

  it("accepte un thème libre et un accent conforme", () => {
    const { values } = applyCardUpdate(
      admin,
      personalCard,
      input({ themeId: "gradient", accentColor: "#52BEC0" }),
    );
    expect(values.themeId).toBe("gradient");
    expect(values.accentColor).toBe("#52bec0");
  });

  it("un membre ne change pas le slug, un admin oui si valide", () => {
    const memberCard = { ...personalCard, userId: member.id };
    expect(() => applyCardUpdate(member, memberCard, input({ slug: "jeannot" }))).toThrow(
      ForbiddenError,
    );
    expect(applyCardUpdate(admin, personalCard, input({ slug: "laurent-f" })).values.slug).toBe(
      "laurent-f",
    );
    expect(() => applyCardUpdate(admin, personalCard, input({ slug: "api" }))).toThrow(
      ValidationError,
    );
  });
});

describe("validation des entrées", () => {
  it("normalise téléphone, URL et e-mail", () => {
    const v = input({
      phone: "06 12 34 56 78",
      website: "ascenzia.ai",
      email: " Jean@Ascenzia.FR ",
    });
    expect(v.phone).toBe("+33612345678");
    expect(v.website).toBe("https://ascenzia.ai/");
    expect(v.email).toBe("jean@ascenzia.fr");
  });

  it("refuse plus de 10 liens, une URL javascript: et un champ inconnu", () => {
    const link = { kind: "custom", label: "x", url: "https://a.fr" };
    expect(
      cardUpdateSchema.safeParse({ firstName: "a", lastName: "b", links: Array(11).fill(link) })
        .success,
    ).toBe(false);
    expect(
      cardUpdateSchema.safeParse({
        firstName: "a",
        lastName: "b",
        links: [{ ...link, url: "javascript:alert(1)" }],
      }).success,
    ).toBe(false);
    expect(cardUpdateSchema.safeParse({ firstName: "a", lastName: "b", userId: "x" }).success).toBe(
      false,
    );
  });
});

describe("connexion (F-30, R-12)", () => {
  const base = {
    adminEmails: ["laurent.fontaine@ascenzia.fr"],
    allowedDomains: ["ascenzia.fr", "ascenzia.ai"],
  };
  it("autorise l'admin, même absent de la table", () => {
    expect(isSignInAllowed({ ...base, email: "Laurent.Fontaine@ascenzia.fr", user: null })).toBe(
      true,
    );
  });
  it("refuse une adresse du domaine jamais invitée", () => {
    expect(isSignInAllowed({ ...base, email: "inconnu@ascenzia.fr", user: null })).toBe(false);
  });
  it("refuse un domaine non autorisé, même présent en base", () => {
    expect(isSignInAllowed({ ...base, email: "x@gmail.com", user: { isActive: true } })).toBe(
      false,
    );
  });
  it("refuse un compte désactivé", () => {
    expect(isSignInAllowed({ ...base, email: "jean@ascenzia.fr", user: { isActive: false } })).toBe(
      false,
    );
  });
  it("accepte un membre invité et actif", () => {
    expect(isSignInAllowed({ ...base, email: "jean@ascenzia.ai", user: { isActive: true } })).toBe(
      true,
    );
  });
  it("calcule le rôle effectif depuis ADMIN_EMAILS", () => {
    expect(effectiveRole("laurent.fontaine@ascenzia.fr", "member", base.adminEmails)).toBe("admin");
    expect(effectiveRole("jean@ascenzia.fr", "member", base.adminEmails)).toBe("member");
  });
});
