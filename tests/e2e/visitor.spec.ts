import { expect, test } from "@playwright/test";

test.describe("parcours visiteur", () => {
  test("la carte Ascenzia s'affiche avec ses actions sans défiler (F-03, R-01)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/laurent.fontaine?src=qr");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Laurent Fontaine");
    const save = page.getByRole("link", { name: "Enregistrer le contact" });
    await expect(save).toBeInViewport();
    // Le paramètre de canal est retiré de l'URL affichée (F-09)
    await expect(page).toHaveURL(/\/laurent\.fontaine$/);
    // Données structurées Person (N-13)
    const ld = await page.locator('script[type="application/ld+json"]').textContent();
    expect(JSON.parse(ld!)["@type"]).toBe("Person");
  });

  test("« Enregistrer le contact » télécharge une vCard 3.0 (F-04)", async ({ page }) => {
    await page.goto("/laurent.fontaine");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: "Enregistrer le contact" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("laurent.fontaine.vcf");
    const body = await (await download.createReadStream()).toArray();
    const vcf = Buffer.concat(body).toString("utf8");
    expect(vcf).toContain("BEGIN:VCARD\r\nVERSION:3.0");
    expect(vcf).toContain("FN:Laurent Fontaine");
    expect(vcf).toContain("ORG:Ascenzia");
  });

  test("le bouton Wallet n'apparaît pas sur Android", async ({ browser }) => {
    const ctx = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36",
    });
    const page = await ctx.newPage();
    await page.goto("/laurent.fontaine");
    await expect(page.getByRole("link", { name: "Enregistrer le contact" })).toBeVisible();
    await expect(page.locator(".wallet-button")).toHaveCount(0);
    await ctx.close();
  });

  test("le bouton Wallet apparaît sur iPhone, avec l'aide Safari dans LinkedIn (R-07)", async ({
    browser,
  }) => {
    const ctx = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]",
    });
    const page = await ctx.newPage();
    await page.goto("/laurent.fontaine");
    await expect(page.locator(".wallet-button")).toBeVisible();
    await expect(page.getByText("ouvrez cette page dans Safari")).toBeVisible();
    await ctx.close();
  });

  test("une carte inexistante renvoie 404", async ({ page }) => {
    const res = await page.goto("/personne.inconnue");
    expect(res?.status()).toBe(404);
  });
});
