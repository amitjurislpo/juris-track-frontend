import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, type Page } from "@playwright/test";
import { Client } from "pg";

// the e2e database and the seeded super admin login come from the backend repo's application-dev.properties (BACKEND_REPO, default ../juris-track-backend)
const { devSettings } = (await import(pathToFileURL(path.join(import.meta.dirname, "..", "..", "scripts", "backend-config.mjs")).href)) as {
  devSettings: () => { databaseUrl: string; superAdminEmail: string };
};
const developmentSettings = devSettings();

/** The seeded super admin (platform user without a business) (the e2e database is seeded by the backend's `reset` command). */
export const SUPER_ADMIN_EMAIL = developmentSettings.superAdminEmail;

/** In the e2e environment every emailed sign-in code is this fixed value (OTP_FIXED_CODE, see scripts/e2e-env.mjs). */
export const OTP = "000000";

/** The e2e database (never the development one): same server, database "<db>_e2e". */
function e2eDatabaseUrl() {
  const url = new URL(developmentSettings.databaseUrl);
  url.pathname = `/${url.pathname.replace(/^\//, "")}_e2e`;
  url.search = "";
  return url.toString();
}

/** Direct DB access for test setup/teardown. */
export async function sql<T = unknown>(query: string, params: unknown[] = []): Promise<T[]> {
  const client = new Client({ connectionString: e2eDatabaseUrl() });
  await client.connect();
  try {
    return (await client.query(query, params)).rows as T[];
  } finally {
    await client.end();
  }
}

/** Asks for a sign-in code for this email and types it. Filling the first box with all six digits submits the form. */
export async function loginWithCode(page: Page, email: string, code: string) {
  // wait for hydration: a click can otherwise beat React to the form
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await page.getByLabel("Digit 1 of 6").fill(code);
}

/** Signs in with the emailed code (sign-in is by code only). */
export async function login(page: Page, email: string) {
  await loginWithCode(page, email, OTP);
}

export async function expectLanded(page: Page, landingPath: string) {
  await expect(page).toHaveURL(new RegExp(`${landingPath}$`), { timeout: 15_000 });
}
