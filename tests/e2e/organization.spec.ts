import { expect, test, type Page } from "@playwright/test";
import { DEMO, expectLanded, login, loginWithCode, OTP, signInElsewhere, sql, storedCodeCount, SUPER_ADMIN_EMAIL, tableRows, toastWith, WRONG_CODE } from "./helpers";

// Module 1 (organization and employees): the super admin's businesses, the owner's settings and employees, and the profile.
// The tests run in order and share one new business per run (unique names and emails, so a rerun on the same database works).

const RUN = Date.now().toString();
const BUSINESS_NAME = `Orbit Labs ${RUN}`;
const RENAMED_BUSINESS_NAME = `Orbit Labs HQ ${RUN}`;
const OWNER = { firstName: "Nora", lastName: "Nadar", email: `owner.${RUN}@orbit.test`, code: `OWN-${RUN}` };
const MANAGER = { firstName: "Mia", lastName: "Manager", email: `mia.${RUN}@orbit.test`, code: `MGR-${RUN}` };
const EMPLOYEE = { firstName: "Eli", lastName: "Employee", email: `eli.${RUN}@orbit.test`, code: `EMP-${RUN}` };

const MANAGER_CYCLE_MESSAGE = "The chosen manager reports to this employee, so the reporting line would go round in a circle.";
const MANAGER_HAS_REPORTS_MESSAGE = "This manager still has active reports. Give them another manager first.";
const PAUSED = "Your company's access is paused";

let businessId = "";

const mainMenu = (page: Page) => page.getByRole("complementary", { name: "Main menu" });
const pageHeading = (page: Page) => page.getByRole("heading", { level: 1 });
const listFilter = (page: Page, label: string) => page.locator(`.tsel:has(> span:text-is("${label}")) select`);
/** Signs in as somebody else in the same browser (the sign-in page sends a signed-in user home, so the cookies go first). */
const switchUser = async (page: Page, email: string) => {
  await page.context().clearCookies();
  await login(page, email);
};
const userIdOf = async (email: string) => (await sql<{ id: string }>("SELECT id FROM users WHERE email = $1", [email]))[0].id;

/** The owner opens the employee page of `email`. */
async function openEmployee(page: Page, email: string) {
  await page.goto(`/admin/employees/${await userIdOf(email)}`);
  await expect(page.getByRole("button", { name: "Save changes" })).toBeVisible();
}

/** The owner adds an employee through the form and lands on the list of employees, where the new person is listed. */
async function addEmployee(page: Page, person: typeof MANAGER, role: "EMPLOYEE" | "MANAGER", managerName: string) {
  await page.goto("/admin/employees/new");
  await page.getByLabel("First name", { exact: true }).fill(person.firstName);
  await page.getByLabel("Last name", { exact: true }).fill(person.lastName);
  await page.getByLabel("Email", { exact: true }).fill(person.email);
  await page.getByLabel("Employee code", { exact: true }).fill(person.code);
  await page.getByLabel("Role", { exact: true }).selectOption(role);
  await page.getByLabel("Reporting manager", { exact: true }).selectOption({ label: managerName });
  await page.getByRole("button", { name: "Add employee" }).click();
  await expect(toastWith(page, "Employee added.")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/employees$/);
  await expect(pageHeading(page)).toHaveText("Employees");
  await page.getByRole("searchbox").fill(person.email);
  await expect(page.getByRole("link", { name: `${person.firstName} ${person.lastName}` })).toBeVisible();
}

test.describe.serial("organization and employees", () => {
  test("the super admin creates a business and its owner; missing fields and a used owner email are explained", async ({ page }) => {
    await login(page, SUPER_ADMIN_EMAIL);
    await expectLanded(page, "/platform");
    await page.getByRole("button", { name: "New business" }).click();
    const dialog = page.getByRole("dialog", { name: "New business" });

    // the API's 400 field errors appear next to their fields
    await dialog.getByRole("button", { name: "Create business" }).click();
    await expect(dialog.getByText("Business name is required.")).toBeVisible();
    await expect(dialog.getByText("Owner's first name is required.")).toBeVisible();
    await expect(dialog.getByText("Email is required.")).toBeVisible();

    await dialog.getByLabel("Business name", { exact: true }).fill(BUSINESS_NAME);
    await expect(dialog.getByLabel("Time zone", { exact: true })).toHaveValue("Asia/Kolkata");
    await dialog.getByLabel("First name", { exact: true }).fill(OWNER.firstName);
    await dialog.getByLabel("Last name", { exact: true }).fill(OWNER.lastName);
    await dialog.getByLabel("Email", { exact: true }).fill(OWNER.email);
    await dialog.getByLabel("Employee code", { exact: true }).fill(OWNER.code);
    await dialog.getByRole("button", { name: "Create business" }).click();

    await expect(toastWith(page, "Business created.")).toBeVisible();
    await expect(page).toHaveURL(/\/platform\/businesses\/[0-9a-f-]{36}$/);
    businessId = page.url().split("/").pop()!;
    await expect(pageHeading(page)).toHaveText(BUSINESS_NAME);
    await expect(page.getByText(OWNER.email)).toBeVisible();
    await expect(page.getByText(OWNER.code)).toBeVisible();
    const [owner] = await sql<{ role: string; business_id: string; is_active: boolean }>("SELECT role, business_id, is_active FROM users WHERE email = $1", [OWNER.email]);
    expect(owner).toEqual({ role: "ADMIN", business_id: businessId, is_active: true });

    // the same owner email again: 409 EMAIL_IN_USE, shown at the email field; nothing is created
    await page.goto("/platform");
    await page.getByRole("button", { name: "New business" }).click();
    await dialog.getByLabel("Business name", { exact: true }).fill(`${BUSINESS_NAME} copy`);
    await dialog.getByLabel("First name", { exact: true }).fill("Other");
    await dialog.getByLabel("Last name", { exact: true }).fill("Person");
    await dialog.getByLabel("Email", { exact: true }).fill(OWNER.email.toUpperCase());
    await dialog.getByRole("button", { name: "Create business" }).click();
    await expect(dialog.getByText("An account with this email already exists.")).toBeVisible();
    await expect(dialog).toBeVisible();
    expect(await sql("SELECT id FROM businesses WHERE name = $1", [`${BUSINESS_NAME} copy`])).toHaveLength(0);
  });

  test("the super admin finds the business by name and by owner email, and filters by status", async ({ page }) => {
    await login(page, SUPER_ADMIN_EMAIL);
    await expectLanded(page, "/platform");
    const search = page.getByRole("searchbox", { name: "Search businesses" });
    await search.fill(RUN);
    await expect(page).toHaveURL(new RegExp(`search=${RUN}`));
    await expect(tableRows(page)).toHaveCount(1);
    await expect(tableRows(page).first()).toContainText(BUSINESS_NAME);
    await expect(tableRows(page).first()).toContainText(OWNER.email);
    await expect(tableRows(page).first()).toContainText("Active");

    await search.fill(OWNER.email);
    await expect(page).toHaveURL(/search=owner\./);
    await expect(tableRows(page)).toHaveCount(1);

    await page.getByRole("group", { name: "Status" }).getByRole("button", { name: "Suspended" }).click();
    await expect(page).toHaveURL(/status=suspended/);
    await expect(page.getByText("No business matches")).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(/\/platform$/);
    await expect(search).toHaveValue("");

    // a row opens the business
    await search.fill(RUN);
    await expect(tableRows(page)).toHaveCount(1);
    await tableRows(page).first().click();
    await expect(page).toHaveURL(new RegExp(`/platform/businesses/${businessId}$`));
  });

  test("the new owner signs in with the fixed code and changes the settings (only the changed fields are sent)", async ({ page }) => {
    await login(page, OWNER.email);
    await expectLanded(page, "/admin");
    await expect(mainMenu(page)).toContainText(BUSINESS_NAME);
    await mainMenu(page).getByRole("link", { name: "Settings" }).click();
    await expect(page.getByLabel("Business name", { exact: true })).toHaveValue(BUSINESS_NAME);

    // a value the API would refuse is caught before sending
    await page.getByLabel("Stale workday hours", { exact: true }).fill("49");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Enter a whole number of hours from 1 to 48.")).toBeVisible();

    await page.getByLabel("Business name", { exact: true }).fill(RENAMED_BUSINESS_NAME);
    await page.getByLabel("Time zone", { exact: true }).selectOption("Asia/Dubai");
    await page.getByLabel("Stale workday hours", { exact: true }).fill("10");
    await page.getByRole("button", { name: "Remove America/New_York" }).click();
    await page.getByLabel("Add a display time zone", { exact: true }).selectOption("Europe/London");
    const patchRequest = page.waitForRequest((request) => request.method() === "PATCH" && request.url().endsWith("/api/business"));
    await page.getByRole("button", { name: "Save changes" }).click();
    expect((await patchRequest).postDataJSON()).toEqual({ name: RENAMED_BUSINESS_NAME, timeZone: "Asia/Dubai", staleWorkdayHours: 10, displayTimeZones: ["Asia/Kolkata", "Europe/London"] });
    await expect(toastWith(page, "Settings saved.")).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("Business name", { exact: true })).toHaveValue(RENAMED_BUSINESS_NAME);
    await expect(page.getByLabel("Stale workday hours", { exact: true })).toHaveValue("10");
    await expect(page.getByLabel("Time zone", { exact: true })).toHaveValue("Asia/Dubai");
    await expect(page.getByRole("button", { name: "Remove Europe/London" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Remove America/New_York" })).toHaveCount(0);
    await expect(mainMenu(page)).toContainText(RENAMED_BUSINESS_NAME);
    const [business] = await sql<{ name: string; time_zone: string; stale_workday_hours: number; display_time_zones: string[] }>(
      "SELECT name, time_zone, stale_workday_hours, display_time_zones FROM businesses WHERE id = $1", [businessId]);
    expect(business).toEqual({ name: RENAMED_BUSINESS_NAME, time_zone: "Asia/Dubai", stale_workday_hours: 10, display_time_zones: ["Asia/Kolkata", "Europe/London"] });

    // changing one field sends only that field
    await page.getByLabel("Stale workday hours", { exact: true }).fill("12");
    const secondRequest = page.waitForRequest((request) => request.method() === "PATCH" && request.url().endsWith("/api/business"));
    await page.getByRole("button", { name: "Save changes" }).click();
    expect((await secondRequest).postDataJSON()).toEqual({ staleWorkdayHours: 12 });
    await expect(toastWith(page, "Settings saved.")).toBeVisible();
  });

  test("the owner adds a manager and an employee who reports to them; a used code is explained; the employee signs in and sees their profile", async ({ page, browser }) => {
    await login(page, OWNER.email);
    await expectLanded(page, "/admin");
    await addEmployee(page, MANAGER, "MANAGER", `${OWNER.firstName} ${OWNER.lastName}`);
    await addEmployee(page, EMPLOYEE, "EMPLOYEE", `${MANAGER.firstName} ${MANAGER.lastName}`);
    const [employee] = await sql<{ role: string; manager_id: string }>("SELECT role, manager_id FROM users WHERE email = $1", [EMPLOYEE.email]);
    expect(employee).toEqual({ role: "EMPLOYEE", manager_id: await userIdOf(MANAGER.email) });

    // the same employee code twice: 409 EMPLOYEE_CODE_IN_USE at the code field; a used email: 409 EMAIL_IN_USE at the email field
    await page.goto("/admin/employees/new");
    await page.getByLabel("First name", { exact: true }).fill("Dup");
    await page.getByLabel("Last name", { exact: true }).fill("Licate");
    await page.getByLabel("Email", { exact: true }).fill(`dup.${RUN}@orbit.test`);
    await page.getByLabel("Employee code", { exact: true }).fill(EMPLOYEE.code);
    await page.getByRole("button", { name: "Add employee" }).click();
    await expect(page.getByText("This employee code is already in use.")).toBeVisible();
    await page.getByLabel("Employee code", { exact: true }).fill("");
    await page.getByLabel("Email", { exact: true }).fill(DEMO.employees[0]);
    await page.getByRole("button", { name: "Add employee" }).click();
    await expect(page.getByText("An account with this email already exists.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/employees\/new$/);

    const employeePage = await signInElsewhere(browser, EMPLOYEE.email, "/dashboard");
    await mainMenu(employeePage).getByRole("link", { name: "Profile" }).click();
    const profile = employeePage.getByRole("region", { name: "Account" });
    await expect(profile).toContainText(`${EMPLOYEE.firstName} ${EMPLOYEE.lastName}`);
    await expect(profile).toContainText(EMPLOYEE.email);
    await expect(profile).toContainText(EMPLOYEE.code);
    await expect(profile).toContainText("Employee");
    await expect(profile).toContainText(`${MANAGER.firstName} ${MANAGER.lastName}`);
    await expect(profile).toContainText(RENAMED_BUSINESS_NAME);
    await expect(profile).toContainText("Asia/Dubai");
    await employeePage.context().close();
  });

  test("the owner edits an employee and reassigns the manager; only the changed fields are sent and a removed manager is sent as null", async ({ page }) => {
    await login(page, OWNER.email);
    await expectLanded(page, "/admin");
    await openEmployee(page, EMPLOYEE.email);
    await expect(page.getByLabel("Reporting manager", { exact: true })).toHaveValue(await userIdOf(MANAGER.email));

    await page.getByLabel("Reporting manager", { exact: true }).selectOption({ label: "No manager" });
    let patchRequest = page.waitForRequest((request) => request.method() === "PATCH" && request.url().includes("/api/employees/"));
    await page.getByRole("button", { name: "Save changes" }).click();
    expect((await patchRequest).postDataJSON()).toEqual({ managerId: null });
    await expect(toastWith(page, "Employee saved.")).toBeVisible();
    expect((await sql<{ manager_id: string | null }>("SELECT manager_id FROM users WHERE email = $1", [EMPLOYEE.email]))[0].manager_id).toBeNull();

    await page.getByLabel("Last name", { exact: true }).fill("Employed");
    await page.getByLabel("Reporting manager", { exact: true }).selectOption({ label: `${OWNER.firstName} ${OWNER.lastName}` });
    patchRequest = page.waitForRequest((request) => request.method() === "PATCH" && request.url().includes("/api/employees/"));
    await page.getByRole("button", { name: "Save changes" }).click();
    expect((await patchRequest).postDataJSON()).toEqual({ lastName: "Employed", managerId: await userIdOf(OWNER.email) });
    await expect(pageHeading(page)).toHaveText(`${EMPLOYEE.firstName} Employed`);

    // back to the original name and manager
    await page.getByLabel("Last name", { exact: true }).fill(EMPLOYEE.lastName);
    await page.getByLabel("Reporting manager", { exact: true }).selectOption({ label: `${MANAGER.firstName} ${MANAGER.lastName}` });
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(pageHeading(page)).toHaveText(`${EMPLOYEE.firstName} ${EMPLOYEE.lastName}`);
    expect((await sql<{ manager_id: string }>("SELECT manager_id FROM users WHERE email = $1", [EMPLOYEE.email]))[0].manager_id).toBe(await userIdOf(MANAGER.email));
    await expect(page.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  test("the employees list: search, filters, sortable columns and pages, all kept in the URL", async ({ page }) => {
    await login(page, OWNER.email);
    await expectLanded(page, "/admin");
    await mainMenu(page).getByRole("link", { name: "Employees" }).click();
    await expect(page).toHaveURL(/\/admin\/employees$/);
    // sorted by name by default: Eli, Mia, Nora
    await expect(tableRows(page)).toHaveCount(3);
    await expect(tableRows(page).nth(0)).toContainText(EMPLOYEE.firstName);
    await expect(tableRows(page).nth(2)).toContainText(OWNER.firstName);
    await expect(page.locator(".tcount")).toHaveText("3 found");

    await page.getByRole("columnheader", { name: "Email" }).getByRole("button").click();
    await expect(page).toHaveURL(/sort=email&sortDirection=asc/);
    await expect(page.getByRole("columnheader", { name: "Email" })).toHaveAttribute("aria-sort", "ascending");
    await expect(tableRows(page).nth(0)).toContainText(EMPLOYEE.email);
    await page.getByRole("columnheader", { name: "Email" }).getByRole("button").click();
    await expect(page).toHaveURL(/sort=email&sortDirection=desc/);
    await expect(tableRows(page).nth(0)).toContainText(OWNER.email);
    await expect(page.getByRole("columnheader", { name: "Email" })).toHaveAttribute("aria-sort", "descending");

    await page.getByRole("searchbox", { name: "Search employees" }).fill(EMPLOYEE.firstName);
    await expect(page).toHaveURL(/search=Eli/);
    await expect(tableRows(page)).toHaveCount(1);
    await page.getByRole("searchbox", { name: "Search employees" }).fill(MANAGER.code);
    await expect(tableRows(page)).toHaveCount(1);
    await expect(tableRows(page).first()).toContainText(MANAGER.email);
    await page.getByRole("searchbox", { name: "Search employees" }).fill("");
    await expect(tableRows(page)).toHaveCount(3);

    await listFilter(page, "Role").selectOption("MANAGER");
    await expect(page).toHaveURL(/role=MANAGER/);
    await expect(tableRows(page)).toHaveCount(1);
    await expect(tableRows(page).first()).toContainText(MANAGER.firstName);
    await listFilter(page, "Role").selectOption("");
    await listFilter(page, "Manager").selectOption({ label: `${MANAGER.firstName} ${MANAGER.lastName}` });
    await expect(page).toHaveURL(new RegExp(`managerId=${await userIdOf(MANAGER.email)}`));
    await expect(tableRows(page)).toHaveCount(1);
    await expect(tableRows(page).first()).toContainText(EMPLOYEE.firstName);

    // pages: two per page
    await page.goto("/admin/employees?pageSize=2");
    await expect(tableRows(page)).toHaveCount(2);
    await expect(page.getByRole("navigation", { name: "Pages" })).toContainText("1–2 of 3");
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(tableRows(page)).toHaveCount(1);
    await expect(page.getByRole("navigation", { name: "Pages" })).toContainText("3–3 of 3");
    await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();
    await page.getByRole("button", { name: "Previous" }).click();
    await expect(tableRows(page)).toHaveCount(2);

    // a row opens the employee
    await tableRows(page).first().click();
    await expect(page).toHaveURL(new RegExp(`/admin/employees/${await userIdOf(EMPLOYEE.email)}$`));
  });

  test("a reporting line that would go round in a circle, and a manager with reports becoming an employee, are refused with clear messages", async ({ page }) => {
    await login(page, OWNER.email);
    await expectLanded(page, "/admin");
    // Eli (reports to Mia) becomes a manager, so he could manage someone
    await openEmployee(page, EMPLOYEE.email);
    await page.getByLabel("Role", { exact: true }).selectOption("MANAGER");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(toastWith(page, "Employee saved.")).toBeVisible();

    // Mia reporting to Eli, who reports to Mia: MANAGER_CYCLE
    await openEmployee(page, MANAGER.email);
    await page.getByLabel("Reporting manager", { exact: true }).selectOption({ label: `${EMPLOYEE.firstName} ${EMPLOYEE.lastName}` });
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText(MANAGER_CYCLE_MESSAGE)).toBeVisible();
    expect((await sql<{ manager_id: string }>("SELECT manager_id FROM users WHERE email = $1", [MANAGER.email]))[0].manager_id).toBe(await userIdOf(OWNER.email));

    // Mia still has Eli reporting to her: she cannot become an employee (MANAGER_HAS_REPORTS)
    await page.getByRole("button", { name: "Undo changes" }).click();
    await page.getByLabel("Role", { exact: true }).selectOption("EMPLOYEE");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText(MANAGER_HAS_REPORTS_MESSAGE)).toBeVisible();
    expect((await sql<{ role: string }>("SELECT role FROM users WHERE email = $1", [MANAGER.email]))[0].role).toBe("MANAGER");

    // Eli has no reports, so he can go back to being an employee
    await openEmployee(page, EMPLOYEE.email);
    await page.getByLabel("Role", { exact: true }).selectOption("EMPLOYEE");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(toastWith(page, "Employee saved.")).toBeVisible();
  });

  test("deactivating an employee ends their open session and they get no new code; the Inactive filter shows them", async ({ page, browser }) => {
    const employeePage = await signInElsewhere(browser, EMPLOYEE.email, "/dashboard");
    await login(page, OWNER.email);
    await expectLanded(page, "/admin");
    await openEmployee(page, EMPLOYEE.email);
    await page.getByRole("button", { name: "Deactivate" }).click();
    const dialog = page.getByRole("dialog", { name: "Deactivate employee" });
    await dialog.getByLabel("Reason").fill("Left the company");
    await dialog.getByRole("button", { name: "Deactivate" }).click();
    await expect(toastWith(page, "Employee deactivated.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reactivate" })).toBeVisible();
    const [audit] = await sql<{ reason: string }>("SELECT reason FROM audit_logs WHERE action = 'employee.deactivated' AND subject_id = $1", [await userIdOf(EMPLOYEE.email)]);
    expect(audit.reason).toBe("Left the company");

    // the open session ended at once: the next page sends the employee to sign-in
    await employeePage.goto("/profile");
    await expect(employeePage).toHaveURL(/\/login\?next=%2Fprofile$/);
    const codesBefore = await storedCodeCount(EMPLOYEE.email);
    await loginWithCode(employeePage, EMPLOYEE.email, OTP);
    await expect(employeePage.locator(".err")).toHaveText(WRONG_CODE);
    expect(await storedCodeCount(EMPLOYEE.email)).toBe(codesBefore);
    await employeePage.context().close();

    await page.goto("/admin/employees");
    await expect(tableRows(page)).toHaveCount(2);
    await page.getByRole("group", { name: "Status" }).getByRole("button", { name: "Inactive" }).click();
    await expect(page).toHaveURL(/status=inactive/);
    await expect(tableRows(page)).toHaveCount(1);
    await expect(tableRows(page).first()).toContainText(EMPLOYEE.email);
    await expect(tableRows(page).first()).toContainText("Inactive");
  });

  test("switching an employee's login off signs them out and refuses their sign-in, they stay in the list, and switching it on lets them back in", async ({ page, browser }) => {
    const managerPage = await signInElsewhere(browser, MANAGER.email, "/team");
    await login(page, OWNER.email);
    await expectLanded(page, "/admin");
    await openEmployee(page, MANAGER.email);
    const card = page.getByRole("region", { name: "Login access" });
    await expect(card).toContainText("Login on");
    await card.getByRole("button", { name: "Disable login" }).click();
    const dialog = page.getByRole("dialog", { name: "Disable login" });
    await dialog.getByLabel("Reason").fill("On leave, no access");
    await dialog.getByRole("button", { name: "Disable login" }).click();
    await expect(toastWith(page, "Login disabled.")).toBeVisible();
    await expect(card).toContainText("Login off");
    await expect(card.getByRole("button", { name: "Enable login" })).toBeVisible();
    const managerId = await userIdOf(MANAGER.email);
    const [audit] = await sql<{ reason: string }>("SELECT reason FROM audit_logs WHERE action = 'employee.login_disabled' AND subject_id = $1", [managerId]);
    expect(audit.reason).toBe("On leave, no access");

    // signed out at once, no new code, and the same "wrong code" answer as for an unknown account
    await managerPage.goto("/profile");
    await expect(managerPage).toHaveURL(/\/login\?next=%2Fprofile$/);
    const codesBefore = await storedCodeCount(MANAGER.email);
    await loginWithCode(managerPage, MANAGER.email, OTP);
    await expect(managerPage.locator(".err")).toHaveText(WRONG_CODE);
    expect(await storedCodeCount(MANAGER.email)).toBe(codesBefore);

    // still in the (active) list, marked "Login off"; the owner's own page offers no switch
    await page.goto("/admin/employees");
    await page.getByRole("searchbox").fill(MANAGER.email);
    await expect(tableRows(page)).toHaveCount(1);
    await expect(tableRows(page).first()).toContainText("Active");
    await expect(tableRows(page).first()).toContainText("Login off");
    await page.goto(`/admin/employees/${await userIdOf(OWNER.email)}`);
    await expect(page.getByRole("region", { name: "Login access" })).toContainText("Login on");
    await expect(page.getByRole("button", { name: "Disable login" })).toHaveCount(0);

    // switched on again: the person signs in with a new code
    await openEmployee(page, MANAGER.email);
    await card.getByRole("button", { name: "Enable login" }).click();
    await page.getByRole("dialog", { name: "Enable login" }).getByRole("button", { name: "Enable login" }).click();
    await expect(toastWith(page, "Login enabled.")).toBeVisible();
    await expect(card).toContainText("Login on");
    await login(managerPage, MANAGER.email);
    await expectLanded(managerPage, "/team");
    await managerPage.context().close();
    expect(await sql("SELECT 1 FROM audit_logs WHERE action = 'employee.login_enabled' AND subject_id = $1", [managerId])).toHaveLength(1);
  });

  test("a manager and an employee cannot open the employees page (sent to their landing page) and the API refuses them", async ({ page }) => {
    await login(page, DEMO.manager);
    await expectLanded(page, "/team");
    await page.goto("/admin/employees");
    await expectLanded(page, "/team");
    expect((await page.request.get("/api/employees")).status()).toBe(403);
    expect((await page.request.get("/api/business")).status()).toBe(403);
    expect((await page.request.get("/api/businesses")).status()).toBe(403);

    await switchUser(page, DEMO.employees[0]);
    await expectLanded(page, "/dashboard");
    await page.goto("/admin/employees/new");
    await expectLanded(page, "/dashboard");
    const refused = await page.request.get("/api/employees");
    expect(refused.status()).toBe(403);
    expect((await refused.json()).code).toBe("FORBIDDEN");

    // and the owner cannot use the super admin's businesses
    await switchUser(page, DEMO.owner);
    await expectLanded(page, "/admin");
    await page.goto("/platform");
    await expectLanded(page, "/admin");
    expect((await page.request.get("/api/businesses")).status()).toBe(403);
  });

  test("the profile shows the signed-in user's own data", async ({ page }) => {
    await login(page, DEMO.employees[0]);
    await expectLanded(page, "/dashboard");
    await page.goto("/profile");
    const profile = page.getByRole("region", { name: "Account" });
    await expect(profile).toContainText("Asha Rao");
    await expect(profile).toContainText(DEMO.employees[0]);
    await expect(profile).toContainText("DEMO-003");
    await expect(profile).toContainText("Manish Manager");
    await expect(profile).toContainText("Demo Company");
    await expect(profile).toContainText("Asia/Kolkata");

    await switchUser(page, DEMO.owner);
    await expectLanded(page, "/admin");
    await page.goto("/profile");
    await expect(page.getByRole("region", { name: "Account" })).toContainText("Owner");
    await expect(page.getByRole("region", { name: "Account" })).toContainText("No manager");
  });

  test("suspending a business pauses its signed-in owner and gives no codes; reactivating lets them back in", async ({ page, browser }) => {
    const ownerPage = await signInElsewhere(browser, OWNER.email, "/admin");
    await mainMenu(ownerPage).getByRole("link", { name: "Employees" }).click();
    await expect(pageHeading(ownerPage)).toHaveText("Employees");

    await login(page, SUPER_ADMIN_EMAIL);
    await expectLanded(page, "/platform");
    await page.goto(`/platform/businesses/${businessId}`);
    await page.getByRole("button", { name: "Suspend" }).click();
    const suspendDialog = page.getByRole("dialog", { name: "Suspend business" });
    await suspendDialog.getByLabel("Reason").fill("Unpaid invoice");
    await suspendDialog.getByRole("button", { name: "Suspend" }).click();
    await expect(toastWith(page, "Business suspended.")).toBeVisible();
    await expect(page.locator(".page-h .chip")).toHaveText("Suspended");
    const [audit] = await sql<{ reason: string }>("SELECT reason FROM audit_logs WHERE action = 'business.suspended' AND entity_id = $1", [businessId]);
    expect(audit.reason).toBe("Unpaid invoice");
    await page.goto("/platform?status=suspended");
    await expect(tableRows(page).filter({ hasText: RENAMED_BUSINESS_NAME })).toHaveCount(1);

    // the owner's next request answers 403 BUSINESS_SUSPENDED: the app shows the paused screen instead of the page
    await mainMenu(ownerPage).getByRole("link", { name: "Settings" }).click();
    await expect(ownerPage.getByText(PAUSED)).toBeVisible();
    const me = await ownerPage.request.get("/api/me");
    expect(me.status()).toBe(403);
    expect((await me.json()).code).toBe("BUSINESS_SUSPENDED");
    await ownerPage.reload();
    await expect(ownerPage.getByText(PAUSED)).toBeVisible();
    await expect(mainMenu(ownerPage)).toHaveCount(0);
    await ownerPage.getByRole("button", { name: "Sign out" }).click();
    await expect(ownerPage).toHaveURL(/\/login\?signedout=1$/);

    // no code for a suspended business's user, and no code works
    const codesBefore = await storedCodeCount(OWNER.email);
    await loginWithCode(ownerPage, OWNER.email, OTP);
    await expect(ownerPage.locator(".err")).toHaveText(WRONG_CODE);
    expect(await storedCodeCount(OWNER.email)).toBe(codesBefore);

    await page.goto(`/platform/businesses/${businessId}`);
    await page.getByRole("button", { name: "Reactivate" }).click();
    await page.getByRole("dialog", { name: "Reactivate business" }).getByRole("button", { name: "Reactivate" }).click();
    await expect(toastWith(page, "Business is active.")).toBeVisible();
    await expect(page.locator(".page-h .chip")).toHaveText("Active");

    await login(ownerPage, OWNER.email);
    await expectLanded(ownerPage, "/admin");
    await ownerPage.context().close();
  });
});
