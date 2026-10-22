import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, type Browser, type Page } from "@playwright/test";
import { Client } from "pg";

// the e2e database and the seeded super admin login come from the backend repo's application-dev.properties (BACKEND_REPO, default ../juris-track-backend)
const { devSettings } = (await import(pathToFileURL(path.join(import.meta.dirname, "..", "..", "scripts", "backend-config.mjs")).href)) as {
  devSettings: () => { databaseUrl: string; superAdminEmail: string };
};
const developmentSettings = devSettings();

/** The seeded super admin (platform user without a business) (the e2e database is seeded by the backend's `reset` command). */
export const SUPER_ADMIN_EMAIL = developmentSettings.superAdminEmail;

/** The demo business of the backend's seed (SeedService): the owner, the manager and the four employees who report to the manager. */
export const DEMO = {
  owner: "owner@demo.juristrack.test",
  manager: "manager@demo.juristrack.test",
  employees: ["asha.rao@demo.juristrack.test", "ben.carter@demo.juristrack.test", "chen.li@demo.juristrack.test", "divya.nair@demo.juristrack.test"],
} as const;

/** In the e2e environment every emailed sign-in code is this fixed value (JURISTRACK_OTP_FIXEDCODE, see scripts/e2e-env.mjs). */
export const OTP = "000000";

/** The e2e API's access-token lifetime (JURISTRACK_SECURITY_ACCESSTOKENTTLSECONDS in scripts/e2e-env.mjs; 5 minutes elsewhere). */
export const ACCESS_TOKEN_TTL_SECONDS = 15;

/** The API's answer to a wrong, expired or burnt code, and to any code for an unknown or inactive account. */
export const WRONG_CODE = "That code is wrong or has expired. Request a new one.";

/** The e2e database (never the development one): same server, database "<db>_e2e". */
function e2eDatabaseUrl() {
  const url = new URL(developmentSettings.databaseUrl);
  url.pathname = `/${url.pathname.replace(/^\//, "")}_e2e`;
  url.search = "";
  return url.toString();
}

/** Direct DB access for test setup/teardown. */
export async function sql<T = unknown>(query: string, parameters: unknown[] = []): Promise<T[]> {
  const client = new Client({ connectionString: e2eDatabaseUrl() });
  await client.connect();
  try {
    return (await client.query(query, parameters)).rows as T[];
  } finally {
    await client.end();
  }
}

/** Opens the sign-in page and asks for a code for this email (the page then shows the six code boxes). */
export async function requestCode(page: Page, email: string) {
  // wait for hydration: a click can otherwise beat React to the form
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
}

/** Asks for a sign-in code for this email and types it. Filling the first box with all six digits submits the form. */
export async function loginWithCode(page: Page, email: string, code: string) {
  await requestCode(page, email);
  await page.getByLabel("Digit 1 of 6").fill(code);
}

/** Signs in with the emailed code (sign-in is by code only). */
export async function login(page: Page, email: string) {
  await loginWithCode(page, email, OTP);
}

export async function expectLanded(page: Page, landingPath: string) {
  await expect(page).toHaveURL(new RegExp(`${landingPath}$`), { timeout: 15_000 });
}

/** A second person at the same time: a fresh browser context (own cookies), signed in and on their landing page. Close its context when done. */
export async function signInElsewhere(browser: Browser, email: string, landingPath: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, email);
  await expectLanded(page, landingPath);
  return page;
}

/** How many sign-in codes were ever stored for this email (no new row = no code was sent). */
export async function storedCodeCount(email: string): Promise<number> {
  const [row] = await sql<{ count: string }>("SELECT count(*) FROM login_otps WHERE email = $1", [email.toLowerCase()]);
  return Number(row.count);
}

/** A short message shown by the app after a write (the API's `message`). */
export const toastWith = (page: Page, text: string) => page.locator(".toast").filter({ hasText: text });

/** The rows of the page's list table. */
export const tableRows = (page: Page) => page.locator("table.t tbody tr");
