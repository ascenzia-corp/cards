import { createHash } from "node:crypto";
import forge from "node-forge";
import { unzipSync } from "fflate";
import { beforeAll, describe, expect, it } from "vitest";
import { buildPassJson, generatePkpass, passSerialFor, type PassCardInput } from "@/lib/pass";
import { ascenziaBrandImages, thumbnailImages } from "@/lib/pass/images";
import { makeTestCertificates } from "../helpers/certs";
import sharp from "sharp";

const config = {
  teamIdentifier: "ABCDE12345",
  passTypeIdentifier: "pass.ai.ascenzia.cards",
  baseUrl: "https://cards.ascenzia.ai",
};

const ascenziaCard: PassCardInput = {
  kind: "ascenzia",
  slug: "laurent.fontaine",
  passSerial: passSerialFor("laurent.fontaine"),
  firstName: "Laurent",
  lastName: "Fontaine",
  title: "Président",
  company: "Société ignorée",
  phone: "+33600000000",
  email: "laurent.fontaine@ascenzia.fr",
  website: "https://ascenzia.ai",
  links: [{ label: "LinkedIn", url: "https://www.linkedin.com/in/exemple" }],
  themeId: "ink",
  accentColor: "#ff0000",
};

const personalCard: PassCardInput = {
  ...ascenziaCard,
  kind: "personal",
  slug: "laurent",
  passSerial: passSerialFor("laurent"),
  company: null,
  themeId: "ink",
  accentColor: "#ddac63",
};

describe("buildPassJson", () => {
  it("respecte les clés de la section 6", () => {
    const json = buildPassJson(ascenziaCard, config);
    expect(json.formatVersion).toBe(1);
    expect(json.passTypeIdentifier).toBe("pass.ai.ascenzia.cards");
    expect(json.teamIdentifier).toBe("ABCDE12345");
    expect(json.organizationName).toBe("Ascenzia");
    expect(json.logoText).toBe("Ascenzia");
    expect(json.description).toBe("Carte de visite de Laurent Fontaine");
    expect(json.sharingProhibited).toBe(false);
    expect(json.barcodes).toEqual([
      {
        format: "PKBarcodeFormatQR",
        message: "https://cards.ascenzia.ai/laurent.fontaine?src=wallet",
        messageEncoding: "iso-8859-1",
        altText: "cards.ascenzia.ai/laurent.fontaine",
      },
    ]);
    expect(json.generic.primaryFields[0]?.value).toBe("Laurent Fontaine");
    // Carte Ascenzia : société forcée
    expect(json.generic.secondaryFields.find((f) => f.key === "company")?.value).toBe("Ascenzia");
  });

  it("produit des couleurs au format rgb()", () => {
    const json = buildPassJson(personalCard, config);
    for (const c of [json.backgroundColor, json.foregroundColor, json.labelColor]) {
      expect(c).toMatch(/^rgb\(\d{1,3}, \d{1,3}, \d{1,3}\)$/);
    }
  });

  it("utilise le nom de la personne pour une carte perso", () => {
    const json = buildPassJson(personalCard, config);
    expect(json.organizationName).toBe("Laurent Fontaine");
    expect(json.logoText).toBe("Laurent Fontaine");
  });

  it("garde un serialNumber stable pour une même carte, distinct entre deux cartes", () => {
    const a = buildPassJson(ascenziaCard, config, new Date("2026-01-01"));
    const b = buildPassJson(
      { ...ascenziaCard, title: "Autre fonction" },
      config,
      new Date("2026-06-01"),
    );
    expect(a.serialNumber).toBe("card-laurent.fontaine");
    expect(b.serialNumber).toBe(a.serialNumber);
    expect(buildPassJson(personalCard, config).serialNumber).not.toBe(a.serialNumber);
  });

  it("omet les champs vides et place les liens au verso", () => {
    const json = buildPassJson({ ...personalCard, phone: null, email: "" }, config);
    expect(json.generic.auxiliaryFields).toEqual([]);
    const back = json.generic.backFields.map((f) => f.value);
    expect(back).toContain("https://www.linkedin.com/in/exemple");
    expect(back).toContain("https://cards.ascenzia.ai/laurent");
  });
});

describe("generatePkpass", () => {
  let certs: ReturnType<typeof makeTestCertificates>;
  let files: Record<string, Uint8Array>;

  beforeAll(async () => {
    certs = makeTestCertificates();
    const json = buildPassJson(ascenziaCard, config);
    const photo = await sharp({
      create: { width: 400, height: 400, channels: 3, background: "#888888" },
    })
      .jpeg()
      .toBuffer();
    const images = {
      ...(await ascenziaBrandImages(json.backgroundColor)),
      ...(await thumbnailImages(photo)),
    };
    const buffer = generatePkpass(json, images, certs);
    files = unzipSync(new Uint8Array(buffer));
  });

  it("contient pass.json, manifest.json, signature et icon.png", () => {
    for (const name of [
      "pass.json",
      "manifest.json",
      "signature",
      "icon.png",
      "icon@2x.png",
      "icon@3x.png",
    ]) {
      expect(files[name], name).toBeDefined();
    }
  });

  it("référence tous les fichiers dans le manifest avec des SHA-1 corrects", () => {
    const manifest = JSON.parse(Buffer.from(files["manifest.json"]!).toString("utf8")) as Record<
      string,
      string
    >;
    const payload = Object.keys(files).filter((n) => n !== "manifest.json" && n !== "signature");
    expect(Object.keys(manifest).sort()).toEqual(payload.sort());
    for (const name of payload) {
      const sha1 = createHash("sha1").update(files[name]!).digest("hex");
      expect(manifest[name], name).toBe(sha1);
    }
  });

  it("produit une signature PKCS#7 détachée par le certificat de pass, avec le WWDR", () => {
    const der = Buffer.from(files["signature"]!).toString("binary");
    const msg = forge.pkcs7.messageFromAsn1(forge.asn1.fromDer(der)) as forge.pkcs7.PkcsSignedData;
    const cns = msg.certificates.map((c) => c.subject.getField("CN").value);
    expect(cns).toContain("Test WWDR");
    expect(cns).toContain("Pass Type ID: pass.ai.ascenzia.cards");
    // Détachée : le contenu signé (manifest) n'est pas embarqué
    expect(
      (msg as unknown as { rawCapture?: { content?: unknown } }).rawCapture?.content,
    ).toBeUndefined();
  });

  it("refuse de générer sans icône", () => {
    expect(() => generatePkpass(buildPassJson(ascenziaCard, config), {}, certs)).toThrow(
      /icon\.png/,
    );
  });

  it("produit des images aux bonnes tailles", async () => {
    const icon3 = await sharp(Buffer.from(files["icon@3x.png"]!)).metadata();
    expect([icon3.width, icon3.height]).toEqual([87, 87]);
    const thumb2 = await sharp(Buffer.from(files["thumbnail@2x.png"]!)).metadata();
    expect([thumb2.width, thumb2.height]).toEqual([180, 180]);
    const logo2 = await sharp(Buffer.from(files["logo@2x.png"]!)).metadata();
    expect(logo2.width!).toBeLessThanOrEqual(320);
    expect(logo2.height!).toBeLessThanOrEqual(100);
  });

  it("transmet le pass.json tel que construit", () => {
    const json = JSON.parse(Buffer.from(files["pass.json"]!).toString("utf8"));
    expect(json.serialNumber).toBe("card-laurent.fontaine");
    expect(json.generic.primaryFields[0].value).toBe("Laurent Fontaine");
    expect(json.barcodes[0].message).toBe("https://cards.ascenzia.ai/laurent.fontaine?src=wallet");
  });
});
