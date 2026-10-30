import { describe, expect, it } from "vitest";
import { buildVCard, escapeText, foldLine } from "@/lib/vcard";

const base = {
  firstName: "Laurent",
  lastName: "Fontaine",
  cardUrl: "https://cards.ascenzia.ai/laurent.fontaine",
};

function unfold(vcf: string): string[] {
  return vcf.replace(/\r\n /g, "").split("\r\n").filter(Boolean);
}

describe("vCard 3.0", () => {
  it("produit l'enveloppe et les lignes CRLF", () => {
    const vcf = buildVCard(base);
    expect(vcf.startsWith("BEGIN:VCARD\r\nVERSION:3.0\r\n")).toBe(true);
    expect(vcf.endsWith("END:VCARD\r\n")).toBe(true);
    expect(vcf.replace(/\r\n/g, "")).not.toMatch(/\n|\r/);
  });

  it("encode en UTF-8 les caractères accentués", () => {
    const vcf = buildVCard({
      ...base,
      firstName: "Jérôme",
      lastName: "Lefèvre",
      title: "Directeur général",
    });
    const lines = unfold(vcf);
    expect(lines).toContain("N:Lefèvre;Jérôme;;;");
    expect(lines).toContain("FN:Jérôme Lefèvre");
    expect(Buffer.from(vcf, "utf8").toString("utf8")).toContain("Directeur général");
  });

  it("échappe virgules, points-virgules, antislash et retours ligne", () => {
    expect(escapeText("a,b;c\\d\ne")).toBe("a\\,b\;c\\\\d\\ne");
    const lines = unfold(buildVCard({ ...base, title: "Associé, CEO; fondateur" }));
    expect(lines).toContain("TITLE:Associé\\, CEO\; fondateur");
  });

  it("plie les lignes longues à 75 octets sans couper un caractère multi-octets", () => {
    const long = "TITLE:" + "é".repeat(100);
    const folded = foldLine(long);
    for (const line of folded.split("\r\n")) {
      expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
    }
    expect(folded.replace(/\r\n /g, "")).toBe(long);
    expect(folded).not.toContain("�");
  });

  it("encode la photo en base64 et la plie", () => {
    const photo = Buffer.alloc(3000, 7);
    const vcf = buildVCard({ ...base, photoJpeg: photo });
    for (const line of vcf.split("\r\n")) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
    const photoLine = unfold(vcf).find((l) => l.startsWith("PHOTO;"));
    expect(photoLine).toBe(`PHOTO;ENCODING=b;TYPE=JPEG:${photo.toString("base64")}`);
  });

  it("omet les champs vides", () => {
    const vcf = buildVCard({
      ...base,
      title: "",
      company: null,
      phone: "  ",
      email: undefined,
      address: {},
    });
    for (const prop of ["TITLE", "ORG", "TEL", "EMAIL", "ADR", "PHOTO", "URL"]) {
      expect(vcf).not.toMatch(new RegExp(`^${prop}[;:]`, "m"));
    }
  });

  it("inclut tous les champs renseignés et l'URL de la carte en note", () => {
    const lines = unfold(
      buildVCard({
        ...base,
        title: "Président",
        company: "Ascenzia",
        phone: "+33612345678",
        email: "laurent.fontaine@ascenzia.fr",
        website: "https://ascenzia.ai",
        address: {
          street: "1 rue de la Paix",
          postalCode: "75002",
          city: "Paris",
          country: "France",
        },
        links: [{ label: "LinkedIn", url: "https://www.linkedin.com/in/exemple" }],
      }),
    );
    expect(lines).toEqual(
      expect.arrayContaining([
        "ORG:Ascenzia",
        "TITLE:Président",
        "TEL;TYPE=CELL,VOICE:+33612345678",
        "EMAIL;TYPE=INTERNET,PREF:laurent.fontaine@ascenzia.fr",
        "URL:https://ascenzia.ai",
        "item1.URL:https://www.linkedin.com/in/exemple",
        "item1.X-ABLabel:LinkedIn",
        "ADR;TYPE=WORK:;;1 rue de la Paix;Paris;;75002;France",
        "NOTE:Carte de visite : https://cards.ascenzia.ai/laurent.fontaine",
      ]),
    );
  });
});
