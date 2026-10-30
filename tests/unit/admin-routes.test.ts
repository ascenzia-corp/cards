/**
 * Intégration des droits sur les routes (section 13) : appel direct des handlers Next,
 * session et base simulées. Les refus doivent intervenir avant toute écriture.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/lib/authz";
import type { CardWithLinks } from "@/lib/db/schema";

const state: { actor: Actor | null; cards: Record<string, CardWithLinks> } = {
  actor: null,
  cards: {},
};
const writes: string[] = [];

vi.mock("@/lib/session", () => ({
  getActor: async () => state.actor,
  requireActor: async () => state.actor,
}));
vi.mock("@/lib/cards", () => ({
  getCardById: async (id: string) => state.cards[id] ?? null,
}));
vi.mock("@/lib/db", () => ({
  getDb: () => {
    writes.push("db");
    throw new Error("La base ne doit pas être atteinte dans ces scénarios.");
  },
}));
vi.mock("@/lib/storage", () => ({
  putObject: async () => writes.push("storage"),
  getObject: async () => null,
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const { GET, PUT } = await import("@/app/api/admin/cards/[id]/route");
const media = await import("@/app/api/admin/cards/[id]/media/route");

const ORIGIN = "https://cards.ascenzia.ai";
const ids = {
  ascenzia: "11111111-1111-4111-8111-111111111111",
  other: "22222222-2222-4222-8222-222222222222",
};
const admin: Actor = { id: "u-admin", email: "laurent.fontaine@ascenzia.fr", role: "admin" };
const member: Actor = { id: "u-member", email: "jean.dupont@ascenzia.fr", role: "member" };

function card(
  id: string,
  userId: string,
  kind: "ascenzia" | "personal",
  slug: string,
): CardWithLinks {
  const now = new Date();
  return {
    id,
    userId,
    kind,
    slug,
    isActive: true,
    firstName: "Jean",
    lastName: "Dupont",
    title: null,
    company: null,
    tagline: null,
    phone: null,
    email: null,
    website: null,
    address: null,
    photoPath: null,
    logoPath: null,
    themeId: kind === "ascenzia" ? "ascenzia" : "ink",
    accentColor: null,
    backgroundPath: null,
    passSerial: `card-${slug}`,
    passGeneratedAt: null,
    createdAt: now,
    updatedAt: now,
    links: [],
  };
}

function req(method: string, body?: unknown, headers: Record<string, string> = {}) {
  return new Request(`${ORIGIN}/api/admin/cards/x`, {
    method,
    headers: {
      host: "cards.ascenzia.ai",
      origin: ORIGIN,
      "content-type": "application/json",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  writes.length = 0;
  state.cards = {
    [ids.ascenzia]: card(ids.ascenzia, member.id, "ascenzia", "jean.dupont"),
    [ids.other]: card(ids.other, "u-someone", "ascenzia", "marie.martin"),
  };
});

describe("GET /api/admin/cards/[id]", () => {
  it("401 sans session", async () => {
    state.actor = null;
    expect((await GET(req("GET"), ctx(ids.ascenzia))).status).toBe(401);
  });
  it("200 pour sa propre carte", async () => {
    state.actor = member;
    const res = await GET(req("GET"), ctx(ids.ascenzia));
    expect(res.status).toBe(200);
    expect((await res.json()).slug).toBe("jean.dupont");
  });
  it("403 pour la carte d'un autre membre", async () => {
    state.actor = member;
    expect((await GET(req("GET"), ctx(ids.other))).status).toBe(403);
  });
  it("200 pour un admin sur n'importe quelle carte", async () => {
    state.actor = admin;
    expect((await GET(req("GET"), ctx(ids.other))).status).toBe(200);
  });
});

describe("PUT /api/admin/cards/[id]", () => {
  const valid = { firstName: "Jean", lastName: "Dupont" };

  it("403 sans en-tête Origin (CSRF)", async () => {
    state.actor = admin;
    const r = new Request(`${ORIGIN}/api/admin/cards/x`, {
      method: "PUT",
      headers: { host: "cards.ascenzia.ai", "content-type": "application/json" },
      body: JSON.stringify(valid),
    });
    expect((await PUT(r, ctx(ids.ascenzia))).status).toBe(403);
  });
  it("403 depuis une origine tierce", async () => {
    state.actor = admin;
    expect(
      (await PUT(req("PUT", valid, { origin: "https://evil.example" }), ctx(ids.ascenzia))).status,
    ).toBe(403);
  });
  it("403 quand un membre écrit la carte d'un autre", async () => {
    state.actor = member;
    expect((await PUT(req("PUT", valid), ctx(ids.other))).status).toBe(403);
    expect(writes).toEqual([]);
  });
  for (const actor of [admin, member]) {
    it(`403 sur le thème d'une carte Ascenzia (${actor.role}, R-09)`, async () => {
      state.actor = actor;
      const res = await PUT(req("PUT", { ...valid, themeId: "gradient" }), ctx(ids.ascenzia));
      expect(res.status).toBe(403);
      expect(writes).toEqual([]);
    });
    it(`403 sur le slug d'une carte Ascenzia (${actor.role}, R-09)`, async () => {
      state.actor = actor;
      const res = await PUT(req("PUT", { ...valid, slug: "jean.dupont2" }), ctx(ids.ascenzia));
      expect(res.status).toBe(403);
      expect(writes).toEqual([]);
    });
  }
  it("422 sur un champ inconnu ou invalide", async () => {
    state.actor = admin;
    expect((await PUT(req("PUT", { ...valid, userId: "x" }), ctx(ids.ascenzia))).status).toBe(422);
    const res = await PUT(req("PUT", { ...valid, phone: "abc" }), ctx(ids.ascenzia));
    expect(res.status).toBe(422);
    expect((await res.json()).fields.phone).toBeDefined();
  });
});

describe("POST /api/admin/cards/[id]/media", () => {
  it("403 sur le logo d'une carte Ascenzia", async () => {
    state.actor = admin;
    const form = new FormData();
    form.set("kind", "logo");
    form.set(
      "file",
      new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" }),
      "logo.png",
    );
    const r = new Request(`${ORIGIN}/api/admin/cards/x/media`, {
      method: "POST",
      headers: { host: "cards.ascenzia.ai", origin: ORIGIN },
      body: form,
    });
    expect((await media.POST(r, ctx(ids.ascenzia))).status).toBe(403);
    expect(writes).toEqual([]);
  });
});
