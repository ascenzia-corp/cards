import { readFileSync } from "node:fs";
import { expect, test, type BrowserContext } from "@playwright/test";

const tokens = () =>
  JSON.parse(readFileSync("test-results-sessions.json", "utf8")) as Record<string, string>;

async function login(context: BrowserContext, role: "admin" | "member", baseURL: string) {
  await context.addCookies([
    { name: "authjs.session-token", value: tokens()[role]!, url: baseURL },
  ]);
}

test.describe("connexion", () => {
  test("/admin sans session redirige vers la connexion (R-14)", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("même message neutre pour une adresse non invitée et un domaine tiers (R-12)", async ({
    page,
  }) => {
    for (const email of ["jamais.invite@ascenzia.fr", "quelquun@gmail.com"]) {
      await page.goto("/login");
      await page.getByLabel("Adresse e-mail").fill(email);
      await page.getByRole("button", { name: "Recevoir le lien" }).click();
      await expect(page.getByRole("heading", { name: "Vérifiez votre boîte mail" })).toBeVisible();
      await expect(page).toHaveURL(/\/login\/verifier\?provider=resend&type=email$/);
    }
  });
});

test.describe("parcours admin", () => {
  test("édition avec aperçu en direct puis publication (F-31)", async ({
    page,
    context,
    baseURL,
  }) => {
    await login(context, "admin", baseURL!);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/admin");
    await page.getByRole("link", { name: /\/laurent\.fontaine ·/ }).click();
    const tagline = `Recette ${Date.now()}`;
    await page.getByLabel("Phrase libre").fill(tagline);
    await expect(page.getByRole("complementary", { name: "Aperçu mobile" })).toContainText(tagline);
    // Thème verrouillé : aucun choix de thème sur une carte Ascenzia (R-09)
    await expect(page.getByRole("radio")).toHaveCount(0);
    await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
    await expect(page.getByText("Carte enregistrée")).toBeVisible();
    await page.goto("/laurent.fontaine");
    await expect(page.getByText(tagline)).toBeVisible();
  });

  test("un accent au contraste insuffisant est refusé (F-06)", async ({
    page,
    context,
    baseURL,
  }) => {
    await login(context, "admin", baseURL!);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/admin");
    await page.getByRole("link", { name: /\/laurent ·/ }).click();
    // Le thème dégradé est conforme quel que soit l'accent : le contrôle porte sur le thème ink
    await page.getByRole("radio", { name: /Ink/ }).check();
    await page.locator("#f-accent").fill("#1a202c");
    await expect(page.getByText(/< 4,5:1/).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Enregistrer", exact: true })).toBeDisabled();
  });
});

test.describe("parcours membre", () => {
  test("un membre ne voit aucune autre carte", async ({ page, context, baseURL }) => {
    await login(context, "member", baseURL!);
    await page.goto("/admin");
    await expect(page.getByText("Aucune carte pour le moment.")).toBeVisible();
    await expect(page.getByText("laurent.fontaine")).toHaveCount(0);
    const res = await page.request.get("/api/admin/cards/00000000-0000-4000-8000-000000000000");
    expect(res.status()).toBe(404);
  });
});
