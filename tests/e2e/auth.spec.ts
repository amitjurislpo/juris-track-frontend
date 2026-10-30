import { expect, test, type Page } from "@playwright/test";
import { ACCESS_TOKEN_TTL_SECONDS, DEMO, expectLanded, login, loginWithCode, OTP, requestCode, sql, SUPER_ADMIN_EMAIL, WRONG_CODE } from "./helpers";

// Sign-in is by emailed code only. The e2e API uses the fixed code 000000, does not throttle and gives access tokens a short
// lifetime (scripts/e2e-env.mjs).

const INACTIVE_EMPLOYEE = DEMO.employees[3];
const mainMenu = (page: Page) => page.getByRole("complementary", { name: "Main menu" });
const cookieValue = async (page: Page, name: string) => (await page.context().cookies()).find((cookie) => cookie.name === name);

test.describe("sign-in by emailed code", () => {
  test.afterAll(async () => {
    await sql("UPDATE users SET is_active = true WHERE email = $1", [INACTIVE_EMPLOYEE]);
  });

  test("the only way in is the emailed code: no password field", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toHaveCount(0);
  });

  test("the super admin lands on the platform pages", async ({ page }) => {
    await login(page, SUPER_ADMIN_EMAIL);
    await expectLanded(page, "/platform");
    await expect(page.locator(".crumbs b")).toHaveText("Businesses");
    await expect(mainMenu(page).getByRole("link", { name: "Businesses" })).toBeVisible();
    await expect(mainMenu(page).getByRole("link", { name: "Dashboard" })).toHaveCount(0); // no business, no personal tracking
  });

  test("the owner lands on the administration overview", async ({ page }) => {
    await login(page, DEMO.owner);
    await expectLanded(page, "/admin");
    await expect(page.locator(".crumbs b")).toHaveText("Overview");
    await expect(mainMenu(page).getByRole("link", { name: "Employees" })).toBeVisible();
    await expect(mainMenu(page).getByRole("link", { name: "Dashboard" })).toBeVisible(); // the owner tracks their own time too
    await expect(page.getByRole("button", { name: /Olivia Owner/ })).toBeVisible();
    await expect(mainMenu(page)).toContainText("JURIS TRACK"); // the brand lockup; the business name is no longer in the menu
  });

  test("the manager lands on the team board", async ({ page }) => {
    await login(page, DEMO.manager);
    await expectLanded(page, "/team");
    await expect(page.locator(".crumbs b")).toHaveText("Team");
    await expect(mainMenu(page).getByRole("link", { name: "My Time" })).toBeVisible();
    await expect(mainMenu(page).getByRole("link", { name: "Employees" })).toHaveCount(0);
  });

  test("an employee lands on the dashboard and sees only the personal section", async ({ page }) => {
    await login(page, DEMO.employees[0]);
    await expectLanded(page, "/dashboard");
    await expect(page.locator(".crumbs b")).toHaveText("Dashboard");
    await expect(page.getByRole("button", { name: /Asha Rao/ })).toBeVisible();
    await expect(mainMenu(page).getByRole("link", { name: "Team" })).toHaveCount(0);
    await expect(mainMenu(page).getByRole("link", { name: "Employees" })).toHaveCount(0);
  });

  test("the code page shows six boxes and the development hint; a wrong code is refused and the right one then works", async ({ page }) => {
    await requestCode(page, DEMO.employees[1]);
    for (let boxNumber = 1; boxNumber <= 6; boxNumber++) await expect(page.getByLabel(`Digit ${boxNumber} of 6`)).toBeVisible();
    await expect(page.getByRole("note")).toContainText(OTP);
    await page.getByLabel("Digit 1 of 6").fill("123456");
    await expect(page.locator(".err")).toHaveText(WRONG_CODE);
    await expect(page.getByLabel("Digit 1 of 6")).toHaveValue("");
    await expect(page).toHaveURL(/\/login/);
    await page.getByLabel("Digit 1 of 6").fill(OTP);
    await expectLanded(page, "/dashboard");
  });

  test("an unknown email gets the same next step, and no code works for it", async ({ page }) => {
    await loginWithCode(page, "nobody.at.all@example.com", OTP); // the same "Check your email" page as for a real account
    await expect(page.locator(".err")).toHaveText(WRONG_CODE);
    await expect(page).toHaveURL(/\/login/);
  });

  test("an inactive account gets the same next step, no code is stored, and no code works for it", async ({ page }) => {
    await sql("UPDATE users SET is_active = false WHERE email = $1", [INACTIVE_EMPLOYEE]);
    const codesBefore = await sql<{ count: string }>("SELECT count(*) FROM login_otps WHERE email = $1", [INACTIVE_EMPLOYEE]);
    await loginWithCode(page, INACTIVE_EMPLOYEE, OTP);
    await expect(page.locator(".err")).toHaveText(WRONG_CODE);
    await expect(page).toHaveURL(/\/login/);
    expect(await sql<{ count: string }>("SELECT count(*) FROM login_otps WHERE email = $1", [INACTIVE_EMPLOYEE])).toEqual(codesBefore);
  });

  test("an invalid email is refused before any code is sent", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.locator(".err")).toHaveText("Enter a valid email.");
    await expect(page.getByRole("heading", { name: "Check your email" })).toHaveCount(0);
  });

  test("there is no 'keep me signed in' choice and the session cookies outlive the browser", async ({ page }) => {
    await requestCode(page, DEMO.employees[2]);
    await expect(page.getByLabel("Keep me signed in for 30 days")).toHaveCount(0);
    await page.getByLabel("Digit 1 of 6").fill(OTP);
    await expectLanded(page, "/dashboard");
    const accessCookie = await cookieValue(page, "jt_at");
    const refreshCookie = await cookieValue(page, "jt_rt");
    expect(accessCookie?.httpOnly).toBe(true);
    expect(accessCookie?.sameSite).toBe("Lax");
    expect(refreshCookie?.expires).toBeGreaterThan(Date.now() / 1000);
  });
});

test.describe("route protection and the session", () => {
  test("an employee opening an owner's page is sent to their own landing page", async ({ page }) => {
    await login(page, DEMO.employees[0]);
    await expectLanded(page, "/dashboard");
    await page.goto("/admin");
    await expectLanded(page, "/dashboard");
    await page.goto("/platform");
    await expectLanded(page, "/dashboard");
  });

  test("signed out, a page sends to sign-in with next= and opens after signing in", async ({ page }) => {
    await page.goto("/team/reports");
    await expect(page).toHaveURL(/\/login\?next=%2Fteam%2Freports$/);
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Email").fill(DEMO.manager);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.getByLabel("Digit 1 of 6").fill(OTP);
    await expectLanded(page, "/team/reports");
  });

  test("sign out ends the session", async ({ page }) => {
    await login(page, DEMO.employees[1]);
    await expectLanded(page, "/dashboard");
    await page.getByRole("button", { name: /Ben Carter/ }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login\?signedout=1$/);
    await expect(page.getByText("Signed out securely.")).toBeVisible();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
    const me = await page.request.get("/api/v1/me");
    expect(me.status()).toBe(401);
  });

  test("the session survives the access token running out (silent refresh with a rotated refresh token)", async ({ page }) => {
    test.setTimeout(90_000);
    await login(page, DEMO.employees[2]);
    await expectLanded(page, "/dashboard");
    const refreshTokenBefore = (await cookieValue(page, "jt_rt"))?.value;
    // wait until the access token has expired: the API now answers 401 TOKEN_EXPIRED to the old cookie
    await page.waitForTimeout((ACCESS_TOKEN_TTL_SECONDS + 2) * 1000);
    const expired = await page.request.get("/api/v1/me");
    expect(expired.status()).toBe(401);
    expect((await expired.json()).code).toBe("TOKEN_EXPIRED");

    await page.goto("/my-time");
    await expectLanded(page, "/my-time");
    await expect(page.locator(".crumbs b")).toHaveText("My Time");
    const refreshTokenAfter = (await cookieValue(page, "jt_rt"))?.value;
    expect(refreshTokenAfter).toBeTruthy();
    expect(refreshTokenAfter).not.toBe(refreshTokenBefore);
    expect((await page.request.get("/api/v1/me")).status()).toBe(200);
  });
});
