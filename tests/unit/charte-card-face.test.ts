import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ASCENZIA_LOGO_DARK_BG, CharteCardFace } from "@/components/charte-card-face";
import { toViewModel } from "@/lib/view-model";

const base = {
  kind: "personal" as const,
  slug: "laurent",
  firstName: "Laurent",
  lastName: "Fontaine",
  title: "CPTO",
  company: null,
  tagline: null,
  phone: null,
  email: null,
  website: null,
  address: null,
  photoPath: null,
  logoPath: null,
  backgroundPath: null,
  themeId: "ink",
  accentColor: null,
  links: [],
};

const render = (logoUrl: string | null) =>
  renderToStaticMarkup(
    createElement(CharteCardFace, { card: toViewModel(base as never, { logoUrl }) }),
  );

describe("CharteCardFace : logo", () => {
  it("affiche le logo de la carte sur une pastille claire, sans le remplacer", () => {
    const html = render("/api/cards/laurent/media/logo.png?v=1");
    expect(html).toContain('class="charte-logo-chip" data-logo="card"');
    expect(html).toContain('src="/api/cards/laurent/media/logo.png?v=1"');
    expect(html).not.toContain(ASCENZIA_LOGO_DARK_BG);
  });

  it("affiche le logo Ascenzia clair quand la carte n'a pas de logo", () => {
    const html = render(null);
    expect(html).toContain(`src="${ASCENZIA_LOGO_DARK_BG}"`);
    expect(html).toContain('data-logo="ascenzia"');
    expect(html).not.toContain("charte-logo-chip");
  });
});
