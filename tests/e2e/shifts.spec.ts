import { expect, test, type Page } from "@playwright/test";
import { apiSession, expectLanded, login, SUPER_ADMIN_EMAIL, tableRows, toastWith } from "./helpers";

// Shifts and the roster: the owner creates a US shift (19:30 - 04:30, ending on the next day), gives it to an employee, the
// employee's timer shows it, the Shifts menu is the owner's alone, and the owner sets a week off in the roster and applies a
// weekly pattern. One new business per run (unique names and emails), set up through the real API. Written against the API
// contract of the night-shift work (backend references/API.md) and run by the main session once the backend is ready.

const RUN = Date.now().toString();
const BUSINESS_NAME = `Shifty ${RUN}`;
const person = (firstName: string, lastName: string, emailName: string) => ({ firstName, lastName, email: `${emailName}.${RUN}@shifty.test` });
const OWNER = person("Sona", "Owner", "owner");
const MANAGER = person("Milan", "Manager", "manager");
const NIGHT_WORKER = person("Nia", "Night", "night");
const SHIFT_NAME = `US shift ${RUN.slice(-5)}`;

const fullNameOf = (somebody: { firstName: string; lastName: string }) => `${somebody.firstName} ${somebody.lastName}`;
const mainMenu = (page: Page) => page.getByRole("complementary", { name: "Main menu" });

test.describe.serial("Shifts and roster", () => {
  test.beforeAll(async () => {
    const superAdmin = await apiSession(SUPER_ADMIN_EMAIL);
    const created = await superAdmin.post("/api/businesses", { data: { name: BUSINESS_NAME, timeZone: "Asia/Kolkata", owner: OWNER } });
    expect(created.status()).toBe(201);
    await superAdmin.dispose();
    const owner = await apiSession(OWNER.email);
    const manager = await owner.post("/api/employees", { data: { ...MANAGER, role: "MANAGER" } });
    expect(manager.status()).toBe(201);
    const managerId = (await manager.json()).data.id as string;
    expect((await owner.post("/api/employees", { data: { ...NIGHT_WORKER, role: "EMPLOYEE", managerId } })).status()).toBe(201);
    await owner.dispose();
  });

  test("the owner creates a US shift that ends on the next day", async ({ page }) => {
    await login(page, OWNER.email);
    await expectLanded(page, "/admin");
    await mainMenu(page).getByRole("link", { name: "Shifts" }).click();
    await expect(page.getByRole("heading", { name: "Shifts", level: 1 })).toBeVisible();
    // the business starts with its default shift
    await expect(tableRows(page).filter({ hasText: "Default" })).toHaveCount(1);

    await page.getByRole("button", { name: "New shift" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill(SHIFT_NAME);
    await dialog.getByLabel("Starts at").fill("19:30");
    await dialog.getByLabel("Ends at").fill("04:30");
    await expect(dialog.getByTestId("shift-preview")).toContainText("19:30 – 04:30 (+1)");
    await expect(dialog.getByTestId("shift-preview")).toContainText("9h 00m");
    await dialog.getByRole("button", { name: "Add shift" }).click();
    await expect(toastWith(page, "Shift")).toBeVisible();
    const row = tableRows(page).filter({ hasText: SHIFT_NAME });
    await expect(row).toContainText("19:30 – 04:30 (+1)");
    await expect(row).toContainText("9h 00m");
  });

  test("the owner gives the shift to an employee and the employee's timer shows it", async ({ page, browser }) => {
    await login(page, OWNER.email);
    await expectLanded(page, "/admin");
    await page.goto("/admin/employees");
    await tableRows(page).filter({ hasText: fullNameOf(NIGHT_WORKER) }).click();
    const card = page.getByRole("region", { name: "Shift" });
    const shiftSelect = card.getByLabel("Change to");
    await shiftSelect.selectOption(await shiftSelect.locator("option", { hasText: SHIFT_NAME }).getAttribute("value") as string);
    await card.getByRole("button", { name: "Change shift" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Days already recorded are not rewritten");
    await dialog.getByRole("button", { name: "Change shift" }).click();
    await expect(toastWith(page, "Shift")).toBeVisible();
    await expect(card.getByTestId("employee-shift")).toContainText(SHIFT_NAME);

    const employeePage = await (await browser.newContext()).newPage();
    await login(employeePage, NIGHT_WORKER.email);
    await expectLanded(employeePage, "/dashboard");
    await employeePage.goto("/my-time");
    await expect(employeePage.getByTestId("shift-line")).toContainText(`${SHIFT_NAME} 19:30 – 04:30 (+1)`);
    await employeePage.context().close();
  });

  test("the Shifts menu belongs to the owner alone", async ({ page, browser }) => {
    await login(page, MANAGER.email);
    await expectLanded(page, "/team");
    await expect(mainMenu(page).getByRole("link", { name: "Shifts" })).toHaveCount(0);
    await page.goto("/admin/shifts");
    await expect(page.getByRole("heading", { name: "Shifts", level: 1 })).toHaveCount(0);
    // a manager does have the roster, without edit controls
    await mainMenu(page).getByRole("link", { name: "Roster" }).click();
    await expect(page.getByTestId("roster-month")).toBeVisible();
    await expect(page.locator("button.roster-cell")).toHaveCount(0);

    const employeePage = await (await browser.newContext()).newPage();
    await login(employeePage, NIGHT_WORKER.email);
    await expectLanded(employeePage, "/dashboard");
    await expect(mainMenu(employeePage).getByRole("link", { name: "Shifts" })).toHaveCount(0);
    await expect(mainMenu(employeePage).getByRole("link", { name: "Roster" })).toHaveCount(0);
    await expect(mainMenu(employeePage).getByRole("link", { name: "My Schedule" })).toBeVisible();
    await employeePage.context().close();
  });

  test("the owner sets a week off in the roster, applies a weekly pattern and the employee sees it", async ({ page, browser }) => {
    await login(page, OWNER.email);
    await expectLanded(page, "/admin");
    await mainMenu(page).getByRole("link", { name: "Roster" }).click();
    await expect(page.getByTestId("roster-month")).toBeVisible();
    const nightRow = page.locator("table.roster tbody tr").filter({ hasText: fullNameOf(NIGHT_WORKER) });
    const cells = nightRow.locator("button.roster-cell");
    await cells.nth(20).click();
    await page.getByTestId("roster-actions").getByRole("button", { name: "Week off", exact: true }).click();
    await expect(toastWith(page, "Roster saved.")).toBeVisible();
    await expect(cells.nth(20)).toHaveText("Off");

    // a weekly pattern: Saturday and Sunday off for the whole month, the preview counts the dates before saving
    await cells.nth(2).click();
    await page.getByTestId("roster-actions").getByRole("button", { name: "Apply pattern…" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByTestId("pattern-preview")).toContainText("will change");
    await dialog.getByRole("button", { name: "Apply pattern", exact: true }).click();
    await expect(toastWith(page, "Pattern applied")).toBeVisible();
    await expect(nightRow.locator("button.roster-cell", { hasText: "Off" }).first()).toBeVisible();

    const employeePage = await (await browser.newContext()).newPage();
    await login(employeePage, NIGHT_WORKER.email);
    await expectLanded(employeePage, "/dashboard");
    await expect(employeePage.getByTestId("next-shift")).toBeVisible();
    await employeePage.goto("/my-schedule");
    await expect(employeePage.locator("ul.schedule-list li")).toHaveCount(14);
    await employeePage.context().close();
  });
});
