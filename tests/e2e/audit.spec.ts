import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { apiSession, DEMO, expectLanded, login, OTP, requestCode, sql, SUPER_ADMIN_EMAIL, tableRows, toastWith, WRONG_CODE } from "./helpers";

// The audit log pages: the owner's `admin/audit-log` (their business) and the super admin's `platform/audit` (every business).
// The tests run in order and share one new employee per run (unique names, so a rerun on the same database works).

const RUN = Date.now().toString();
const LAST_NAME = `Auditson${RUN}`;
const PERSON = { firstName: "Ava", lastName: LAST_NAME, email: `ava.${RUN}@audit.test`, code: `AUD-${RUN}`, newCode: `AUD2-${RUN}` };
const OWNER_NAME = "Olivia Owner";
const SIGN_IN_EMPLOYEE = { email: DEMO.employees[1], name: "Ben Carter" };
const DENIED_EMPLOYEE = { email: DEMO.employees[0], name: "Asha Rao" };

const pageHeading = (page: Page) => page.getByRole("heading", { level: 1 });
const listFilter = (page: Page, label: string) => page.locator(`.tsel:has(> span:text-is("${label}")) select`);
const picker = (page: Page, label: string) => page.locator(`.tsel:has(> span:text-is("${label}")) input[role="combobox"]`);
/** The rows, or the rows of one action label (matched exactly: "Signed in" is not "Not signed in"). */
const auditRows = (page: Page, actionLabel?: string) => {
  if (!actionLabel) return tableRows(page);
  const escaped = actionLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return tableRows(page).filter({ has: page.locator("td b", { hasText: new RegExp(`^${escaped}$`) }) });
};
const panel = (page: Page) => page.getByRole("dialog");
const userIdOf = async (email: string) => (await sql<{ id: string }>("SELECT id FROM users WHERE email = $1", [email]))[0].id;
/** The page has no sideways scroll. */
const sidewaysOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
/** The next `GET /api/audit-logs` list request the page sends. */
const nextListRequest = (page: Page, isWanted: (parameters: URLSearchParams) => boolean = () => true) =>
  page.waitForRequest((request) => request.method() === "GET" && /\/api\/audit-logs(\?|$)/.test(request.url()) && !request.url().includes("format=csv")
    && isWanted(new URL(request.url()).searchParams));

/** Picks `optionName` in a search picker after typing `text`. */
async function pick(page: Page, label: string, text: string, optionName: string | RegExp) {
  const field = picker(page, label);
  await field.click();
  await field.fill(text);
  await page.getByRole("option", { name: optionName }).first().click();
}

/** Today's date in the demo business's time zone (the owner's date filters use it). */
async function demoToday(): Promise<string> {
  const [business] = await sql<{ time_zone: string }>("SELECT time_zone FROM businesses WHERE name = 'Demo Company'");
  return new Intl.DateTimeFormat("en-CA", { timeZone: business.time_zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

test.describe.serial("audit log", () => {
  test("the owner adds, edits and deactivates an employee and finds each entry with actor, subject, action and before/after", async ({ page }) => {
    await login(page, DEMO.owner);
    await expectLanded(page, "/admin");

    // add
    await page.goto("/admin/employees/new");
    await page.getByLabel("First name", { exact: true }).fill(PERSON.firstName);
    await page.getByLabel("Last name", { exact: true }).fill(PERSON.lastName);
    await page.getByLabel("Email", { exact: true }).fill(PERSON.email);
    await page.getByLabel("Employee code", { exact: true }).fill(PERSON.code);
    await page.getByLabel("Reporting manager", { exact: true }).selectOption({ label: "Manish Manager" });
    await page.getByRole("button", { name: "Add employee" }).click();
    await expect(toastWith(page, "Employee added.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/employees$/); // the list, where the new person is opened
    await page.getByRole("searchbox").fill(PERSON.email);
    await page.getByRole("link", { name: `${PERSON.firstName} ${PERSON.lastName}` }).click();
    await expect(page).toHaveURL(/\/admin\/employees\/[0-9a-f-]{36}$/);
    // edit
    await page.getByLabel("Employee code", { exact: true }).fill(PERSON.newCode);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(toastWith(page, "Employee saved.")).toBeVisible();
    // deactivate (with a reason)
    await page.getByRole("button", { name: "Deactivate" }).click();
    const dialog = page.getByRole("dialog", { name: "Deactivate employee" });
    await dialog.getByLabel("Reason").fill("Contract ended");
    await dialog.getByRole("button", { name: "Deactivate" }).click();
    await expect(toastWith(page, "Employee deactivated.")).toBeVisible();

    await page.goto("/admin/audit-log");
    await expect(pageHeading(page)).toHaveText("Audit Log");
    await expect(page.getByText("Entries are permanent: nobody can edit or delete them.")).toBeVisible();
    await page.getByRole("searchbox", { name: "Search the audit log" }).fill(LAST_NAME);
    await expect(page).toHaveURL(new RegExp(`search=${LAST_NAME}`));
    for (const label of ["Employee added", "Employee updated", "Employee deactivated"]) {
      const row = auditRows(page, label);
      await expect(row).toHaveCount(1);
      await expect(row).toContainText(OWNER_NAME);
      await expect(row).toContainText("Owner");
      await expect(row).toContainText(`${PERSON.firstName} ${PERSON.lastName}`);
      await expect(row).toContainText("People");
      await expect(row).toContainText("Success");
    }
    // opening the record was audited too
    await expect(auditRows(page, "Employee viewed").first()).toContainText(`${PERSON.firstName} ${PERSON.lastName}`);

    // the update's panel: every field and the before/after diff
    await auditRows(page, "Employee updated").click();
    const entryPanel = panel(page);
    await expect(entryPanel).toBeVisible();
    await expect(entryPanel.getByRole("heading", { name: "Employee updated" })).toBeVisible();
    await expect(entryPanel).toContainText("employee.updated");
    await expect(entryPanel).toContainText(OWNER_NAME);
    await expect(entryPanel).toContainText("PATCH /api/employees/");
    await expect(entryPanel).toContainText("Chrome"); // the user agent
    const changedCode = entryPanel.locator(".diff-row.changed", { hasText: "employeeCode" });
    await expect(changedCode.locator(".diff-value.old")).toHaveText(PERSON.code);
    await expect(changedCode.locator(".diff-value.new")).toHaveText(PERSON.newCode);
    await expect(changedCode).toContainText("Changed");
    // unchanged fields are hidden until asked for
    await expect(entryPanel.locator(".diff-row.unchanged")).toHaveCount(0);
    await entryPanel.getByRole("button", { name: /Show \d+ unchanged fields/ }).click();
    await expect(entryPanel.locator(".diff-row.unchanged", { hasText: "firstName" })).toContainText(PERSON.firstName);
    // nothing in the panel edits or deletes the entry
    await expect(entryPanel.getByRole("button", { name: /edit|delete/i })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(entryPanel).toHaveCount(0);

    // the creation lists the new record as added fields; the deactivation shows the reason and the status change
    await auditRows(page, "Employee added").click();
    await expect(panel(page).locator(".diff-row.added", { hasText: "email" })).toContainText(PERSON.email);
    await page.getByRole("button", { name: "Close" }).click();
    await auditRows(page, "Employee deactivated").click();
    await expect(panel(page)).toContainText("Contract ended");
    await expect(panel(page).locator(".diff-row.changed", { hasText: "isActive" })).toContainText("false");
    await page.keyboard.press("Escape");
  });

  test("sign-in events are recorded: the code request, a wrong code as DENIED and the sign-in", async ({ page, browser }) => {
    const employeeContext = await browser.newContext();
    const employeePage = await employeeContext.newPage();
    await requestCode(employeePage, SIGN_IN_EMPLOYEE.email);
    await employeePage.getByLabel("Digit 1 of 6").fill("123456");
    await expect(employeePage.locator(".err")).toHaveText(WRONG_CODE);
    await employeePage.getByLabel("Digit 1 of 6").fill(OTP);
    await expectLanded(employeePage, "/dashboard");
    await employeeContext.close();

    await login(page, DEMO.owner);
    await expectLanded(page, "/admin");
    await page.goto("/admin/audit-log");
    await pick(page, "Subject", "Ben", SIGN_IN_EMPLOYEE.name);
    await expect(page).toHaveURL(new RegExp(`subjectId=${await userIdOf(SIGN_IN_EMPLOYEE.email)}`));
    await listFilter(page, "Action").selectOption("auth.");
    await expect(page).toHaveURL(/action=auth\./);
    await expect(auditRows(page, "Sign-in code requested").first()).toBeVisible();
    await expect(auditRows(page, "Signed in").first()).toContainText(SIGN_IN_EMPLOYEE.name);
    const failed = auditRows(page, "Sign-in failed").first();
    await expect(failed).toContainText("Denied");
    await expect(failed).toContainText("Not signed in");

    // only the refusals
    await listFilter(page, "Outcome").selectOption("DENIED");
    await expect(page).toHaveURL(/outcome=DENIED/);
    await expect(auditRows(page, "Signed in")).toHaveCount(0);
    await auditRows(page, "Sign-in failed").first().click();
    await expect(panel(page)).toContainText("wrong_code");
    await expect(panel(page)).toContainText("POST /api/auth/sessions");
    await page.keyboard.press("Escape");

    // the active-filters bar names each filter and clears them
    const activeBar = page.getByRole("group", { name: "Active filters" });
    await expect(activeBar).toContainText(`Subject: ${SIGN_IN_EMPLOYEE.name}`);
    await expect(activeBar).toContainText("Action: All: Sign-in and sessions");
    await activeBar.getByRole("button", { name: /Remove filter Outcome: Denied/ }).click();
    await expect(page).not.toHaveURL(/outcome=/);
    await activeBar.getByRole("button", { name: "Clear all" }).click();
    await expect(page).toHaveURL(/\/admin\/audit-log$/);
    await expect(activeBar).toHaveCount(0);
  });

  test("manager and employee cannot open the audit log; the API refuses them and the owner sees the refusal", async ({ page }) => {
    // the pages send them to their landing page
    await login(page, DEMO.manager);
    await expectLanded(page, "/team");
    await page.goto("/admin/audit-log");
    await expectLanded(page, "/team");
    await page.goto("/platform/audit");
    await expectLanded(page, "/team");
    await page.context().clearCookies();
    await login(page, DENIED_EMPLOYEE.email);
    await expectLanded(page, "/dashboard");
    await page.goto("/admin/audit-log");
    await expectLanded(page, "/dashboard");

    // and the API answers 403 to both, for the list, one entry and the export
    const [anyEntry] = await sql<{ id: string }>("SELECT id FROM audit_logs ORDER BY created_at DESC LIMIT 1");
    for (const email of [DENIED_EMPLOYEE.email, DEMO.manager]) {
      const session = await apiSession(email);
      for (const path of ["/api/audit-logs", `/api/audit-logs/${anyEntry.id}`, "/api/audit-logs?format=csv"]) {
        const response = await session.get(path);
        expect(response.status(), `${email} ${path}`).toBe(403);
        expect((await response.json()).code).toBe("FORBIDDEN");
      }
      await session.dispose();
    }

    // the owner finds the employee's refused requests as security.access_denied
    await page.context().clearCookies();
    await login(page, DEMO.owner);
    await expectLanded(page, "/admin");
    await page.goto("/admin/audit-log");
    await pick(page, "Actor", "Asha", DENIED_EMPLOYEE.name);
    await listFilter(page, "Action").selectOption("security.access_denied");
    await expect(page).toHaveURL(/action=security\.access_denied/);
    const refusals = auditRows(page, "Access denied");
    await expect(refusals.first()).toBeVisible();
    expect(await refusals.count()).toBeGreaterThanOrEqual(3); // the list, one entry and the export
    await expect(refusals.first()).toContainText("Denied");
    await expect(refusals.first()).toContainText("Security");
    await refusals.first().click();
    await expect(panel(page)).toContainText("FORBIDDEN");
    await expect(panel(page)).toContainText("GET /api/audit-logs");
  });

  test("filters, sorting and paging go to the API under its own parameter names", async ({ page }) => {
    await login(page, DEMO.owner);
    await expectLanded(page, "/admin");
    const today = await demoToday();
    await page.goto("/admin/audit-log");
    await expect(auditRows(page).first()).toBeVisible();

    // date presets
    const dates = page.getByRole("group", { name: "Date range" });
    let request = nextListRequest(page, (parameters) => parameters.has("from"));
    await dates.getByRole("button", { name: "Today" }).click();
    expect(new URL((await request).url()).searchParams.get("from")).toBe(today);
    await expect(page).toHaveURL(new RegExp(`from=${today}&to=${today}`));
    await expect(dates.getByRole("button", { name: "Today" })).toHaveAttribute("aria-pressed", "true");
    await expect(auditRows(page).first()).toBeVisible();
    await dates.getByRole("button", { name: "Custom" }).click();
    await page.getByLabel("From date").fill("2020-01-01");
    await page.getByLabel("To date").fill("2020-01-31");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(/from=2020-01-01&to=2020-01-31/);
    await expect(page.getByText("No entries match")).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(/\/admin\/audit-log$/);

    // actor + category + search
    await pick(page, "Actor", "Olivia", OWNER_NAME);
    request = nextListRequest(page, (parameters) => parameters.has("category"));
    await listFilter(page, "Category").selectOption("people");
    const sentParameters = new URL((await request).url()).searchParams;
    expect(sentParameters.get("actorId")).toBe(await userIdOf(DEMO.owner));
    expect(sentParameters.get("category")).toBe("people");
    await expect(page).toHaveURL(/category=people/);
    await expect(page.locator(".audit-loading")).toHaveCount(0);
    await expect(auditRows(page, "Employee added").first()).toBeVisible();
    for (const row of await auditRows(page).all()) await expect(row).toContainText(OWNER_NAME);
    await page.getByRole("searchbox", { name: "Search the audit log" }).fill(LAST_NAME);
    await expect(page).toHaveURL(new RegExp(`search=${LAST_NAME}`));
    await expect(auditRows(page)).toHaveCount(3); // added, updated, deactivated
    await page.getByRole("button", { name: "Clear all" }).click();

    // sorting: by action, ascending then descending
    await expect(page).toHaveURL(/\/admin\/audit-log$/);
    request = nextListRequest(page, (parameters) => parameters.get("sortDirection") === "asc");
    await page.getByRole("columnheader", { name: /Action/ }).getByRole("button").click();
    let sent = new URL((await request).url()).searchParams;
    expect([sent.get("sort"), sent.get("sortDirection")]).toEqual(["action", "asc"]);
    await expect(page.getByRole("columnheader", { name: /Action/ })).toHaveAttribute("aria-sort", "ascending");
    await expect(page.locator(".audit-loading")).toHaveCount(0);
    const firstAscending = await auditRows(page).first().locator("small.mono").first().textContent();
    request = nextListRequest(page, (parameters) => parameters.get("sortDirection") === "desc");
    await page.getByRole("columnheader", { name: /Action/ }).getByRole("button").click();
    sent = new URL((await request).url()).searchParams;
    expect(sent.get("sortDirection")).toBe("desc");
    await expect(page.getByRole("columnheader", { name: /Action/ })).toHaveAttribute("aria-sort", "descending");
    await expect(page.locator(".audit-loading")).toHaveCount(0);
    const firstDescending = await auditRows(page).first().locator("small.mono").first().textContent();
    expect(firstAscending! < firstDescending!).toBe(true);

    // paging: five per page, then the next page
    await page.goto("/admin/audit-log?pageSize=5");
    await expect(auditRows(page)).toHaveCount(5);
    await expect(page.locator(".audit-loading")).toHaveCount(0);
    const firstPageIds = await auditRows(page).evaluateAll((rows) => rows.map((row) => row.getAttribute("data-audit-id")));
    request = nextListRequest(page, (parameters) => parameters.has("page"));
    await page.getByRole("navigation", { name: "Pages" }).getByRole("button", { name: "Next" }).click();
    sent = new URL((await request).url()).searchParams;
    expect([sent.get("page"), sent.get("pageSize")]).toEqual(["2", "5"]);
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByRole("navigation", { name: "Pages" })).toContainText("6–10 of");
    await expect(page.locator(".audit-loading")).toHaveCount(0);
    const secondPageIds = await auditRows(page).evaluateAll((rows) => rows.map((row) => row.getAttribute("data-audit-id")));
    expect(secondPageIds.filter((id) => firstPageIds.includes(id))).toEqual([]);
  });

  test("the panel copies the request id and filters by it; keyboard opens and closes it", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await login(page, DEMO.owner);
    await expectLanded(page, "/admin");
    await page.goto(`/admin/audit-log?search=${LAST_NAME}&action=employee.updated`);
    const row = auditRows(page, "Employee updated");
    await expect(row).toHaveCount(1);
    const entryId = await row.getAttribute("data-audit-id");
    const [entry] = await sql<{ request_id: string }>("SELECT request_id FROM audit_logs WHERE id = $1", [entryId]);

    // keyboard: Enter opens, focus moves into the panel, Escape closes and focus returns to the row
    await row.focus();
    await page.keyboard.press("Enter");
    const entryPanel = panel(page);
    await expect(entryPanel).toBeVisible();
    await expect(entryPanel).toBeFocused();
    await expect(entryPanel).toContainText(entry.request_id);
    await page.keyboard.press("Escape");
    await expect(entryPanel).toHaveCount(0);
    await expect(row).toBeFocused();

    await row.click();
    await entryPanel.getByRole("button", { name: "Copy request id" }).click();
    await expect(toastWith(page, "Request id copied.")).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(entry.request_id);
    await entryPanel.getByRole("button", { name: "All entries of this request" }).click();
    await expect(entryPanel).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`search=${entry.request_id}`));
    await expect(page).not.toHaveURL(/action=/);
    const requestEntries = await sql<{ id: string }>("SELECT id FROM audit_logs WHERE request_id = $1", [entry.request_id]);
    await expect(auditRows(page)).toHaveCount(requestEntries.length);
  });

  test("the CSV export downloads the filtered rows with a byte order mark and CRLF, and is itself audited", async ({ page }) => {
    await login(page, DEMO.owner);
    await expectLanded(page, "/admin");
    await page.goto(`/admin/audit-log?search=${LAST_NAME}&action=employee.`);
    await expect(auditRows(page)).toHaveCount(3);
    const exportLink = page.getByRole("link", { name: "Export CSV" });
    await expect(exportLink).toHaveAttribute("href", `/api/audit-logs?search=${LAST_NAME}&action=employee.&format=csv`);

    const downloadEvent = page.waitForEvent("download");
    await exportLink.click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toMatch(/^audit-log-\d{4}-\d{2}-\d{2}\.csv$/);
    const bytes = readFileSync(await download.path());
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const text = bytes.toString("utf8").slice(1);
    const lines = text.split("\r\n");
    expect(lines.at(-1)).toBe(""); // every line ends with CRLF
    expect(lines.join("")).not.toContain("\n"); // no bare line feeds
    expect(lines[0]).toBe('"Time (UTC)","Business","Actor","Actor role","Subject","Action","Category","Outcome","Entity type","Entity id","Source","IP address","Request id","Method","Path","Reason","Summary","Before","After"');
    const rows = lines.slice(1, -1);
    expect(rows).toHaveLength(3);
    expect(rows.join("\n")).toContain('"employee.created"');
    expect(rows.join("\n")).toContain('"employee.deactivated"');
    expect(rows.join("\n")).toContain('"Contract ended"');

    // the same request through the API: the CSV of the filter
    const response = await page.request.get(`/api/audit-logs?search=${LAST_NAME}&action=employee.&format=csv`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/csv");
    expect(response.headers()["content-disposition"]).toContain("attachment");
    expect((await response.body()).subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));

    // each export is an entry: the owner sees "Audit log exported" with the filters
    await page.goto("/admin/audit-log?action=audit.exported");
    const exported = auditRows(page, "Audit log exported");
    await expect(exported.first()).toContainText(OWNER_NAME);
    expect(await exported.count()).toBeGreaterThanOrEqual(2);
    await exported.first().click();
    await expect(panel(page).locator(".diff-row.added", { hasText: "rowCount" })).toContainText("3");
  });

  test("there is no way to edit or delete an entry: no controls, and the API refuses", async ({ page }) => {
    await login(page, DEMO.owner);
    await expectLanded(page, "/admin");
    await page.goto("/admin/audit-log");
    await expect(auditRows(page).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /edit|delete/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /edit|delete/i })).toHaveCount(0);
    await auditRows(page).first().click();
    await expect(panel(page).getByRole("button", { name: /edit|delete|save/i })).toHaveCount(0);
    await expect(panel(page)).toContainText("Audit entries are permanent: nobody can change or delete them.");

    const [entry] = await sql<{ id: string; action: string }>("SELECT id, action FROM audit_logs ORDER BY created_at DESC LIMIT 1");
    const session = await apiSession(DEMO.owner);
    for (const method of ["DELETE", "PUT", "PATCH"] as const) {
      const response = await session.fetch(`/api/audit-logs/${entry.id}`, { method, data: { action: "tampered" } });
      expect(response.status(), method).toBeGreaterThanOrEqual(400);
    }
    expect((await session.delete("/api/audit-logs")).status()).toBeGreaterThanOrEqual(400);
    await session.dispose();
    const [unchanged] = await sql<{ action: string }>("SELECT action FROM audit_logs WHERE id = $1", [entry.id]);
    expect(unchanged.action).toBe(entry.action);
  });

  test("the page fits a phone and a desktop without sideways scrolling", async ({ page }) => {
    await login(page, DEMO.owner);
    await expectLanded(page, "/admin");
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/admin/audit-log");
      await expect(auditRows(page).first()).toBeVisible();
      expect(await sidewaysOverflow(page), `${width} px`).toBeLessThanOrEqual(0);
      await auditRows(page).first().click();
      await expect(panel(page)).toBeVisible();
      expect(await sidewaysOverflow(page), `${width} px with the panel`).toBeLessThanOrEqual(0);
      // once it has slid in, the panel ends inside the window
      await expect.poll(async () => { const panelBox = await panel(page).boundingBox(); return panelBox!.x + panelBox!.width; }, { message: `${width} px panel` })
        .toBeLessThanOrEqual(width);
      await page.keyboard.press("Escape");
    }
  });

  test("the super admin sees the platform log and filters by business and by no business", async ({ page }) => {
    await login(page, SUPER_ADMIN_EMAIL);
    await expectLanded(page, "/platform");
    await page.getByRole("complementary", { name: "Main menu" }).getByRole("link", { name: "Audit Log" }).click();
    await expect(page).toHaveURL(/\/platform\/audit$/);
    await expect(pageHeading(page)).toHaveText("Audit Log");
    await expect(page.getByRole("link", { name: "Export CSV" })).toBeVisible();
    // no person pickers for the super admin (free text search only), a business filter instead
    await expect(picker(page, "Actor")).toHaveCount(0);
    await expect(page.getByRole("columnheader", { name: "Business" })).toBeVisible();

    // the owner's changes appear with the business's name
    await page.getByRole("searchbox", { name: "Search the audit log" }).fill(LAST_NAME);
    await expect(auditRows(page, "Employee updated")).toContainText("Demo Company");
    await page.getByRole("button", { name: "Clear all" }).click();

    // one business
    const [demo] = await sql<{ id: string }>("SELECT id FROM businesses WHERE name = 'Demo Company'");
    let request = nextListRequest(page, (parameters) => parameters.has("businessId"));
    await pick(page, "Business", "Demo", "Demo Company");
    expect(new URL((await request).url()).searchParams.get("businessId")).toBe(demo.id);
    await expect(page).toHaveURL(new RegExp(`businessId=${demo.id}`));
    await expect(page.locator(".audit-loading")).toHaveCount(0);
    for (const row of await auditRows(page).all()) await expect(row).toContainText("Demo Company");
    await expect(page.getByRole("group", { name: "Active filters" })).toContainText("Business: Demo Company");

    // no business: the platform's own events (the super admin's sign-in, the business list views)
    request = nextListRequest(page, (parameters) => parameters.get("businessId") === "none");
    await pick(page, "Business", "", "No business (platform)");
    expect(new URL((await request).url()).searchParams.get("businessId")).toBe("none");
    await expect(page).toHaveURL(/businessId=none/);
    await expect(page.locator(".audit-loading")).toHaveCount(0);
    await expect(auditRows(page, "Signed in").first()).toContainText("Platform admin");
    for (const row of await auditRows(page).all()) await expect(row).toContainText("No business");
    await auditRows(page, "Signed in").first().click();
    await expect(panel(page)).toContainText("No business");
    await page.keyboard.press("Escape");

    // the platform log's API answers every business for the super admin
    const response = await page.request.get(`/api/audit-logs?businessId=${demo.id}&pageSize=1`);
    expect(response.status()).toBe(200);
    expect((await response.json()).data.rows[0].businessName).toBe("Demo Company");
  });

  test("an export over 10,000 entries is explained instead of downloaded, and the API refuses it", async ({ page }) => {
    // 10,001 old platform entries of an action nobody else writes (the table only refuses UPDATE and DELETE)
    await sql(`INSERT INTO audit_logs (business_id, action, entity_type, category, outcome, source, created_at)
               SELECT NULL, 'test.bulk_entry', 'request', 'security', 'SUCCESS', 'SYSTEM', TIMESTAMPTZ '2020-01-01 00:00:00Z' + make_interval(secs => step)
               FROM generate_series(1, 10001) AS step
               WHERE NOT EXISTS (SELECT 1 FROM audit_logs WHERE action = 'test.bulk_entry')`);
    await login(page, SUPER_ADMIN_EMAIL);
    await expectLanded(page, "/platform");
    await page.goto("/platform/audit?action=test.");
    await expect(page.getByText("10001 found")).toBeVisible();
    let isDownloadStarted = false;
    page.on("download", () => { isDownloadStarted = true; });
    await page.getByRole("link", { name: "Export CSV" }).click();
    const refusal = page.getByRole("alert").filter({ hasText: "Too many entries to export" });
    await expect(refusal).toContainText("The export would hold 10,001 entries; narrow the filters to at most 10,000.");
    expect(isDownloadStarted).toBe(false);

    const response = await page.request.get("/api/audit-logs?action=test.&format=csv");
    expect(response.status()).toBe(422);
    const problem = await response.json();
    expect(problem.code).toBe("EXPORT_TOO_LARGE");
    expect(problem.detail).toBe("The export would hold 10001 entries; narrow the filters to at most 10000.");

    // a narrower filter can be exported again (here: nothing matches, the file holds the header only)
    await page.goto("/platform/audit?action=test.bulk_entry&search=no-such-entry");
    await expect(page.getByText("No entries match")).toBeVisible();
    const downloadEvent = page.waitForEvent("download");
    await page.getByRole("link", { name: "Export CSV" }).click();
    expect((await downloadEvent).suggestedFilename()).toMatch(/\.csv$/);
  });

  test("the unknown action of a newer backend reads as words", async ({ page }) => {
    await login(page, SUPER_ADMIN_EMAIL);
    await expectLanded(page, "/platform");
    await page.goto("/platform/audit?action=test.bulk_entry&pageSize=1");
    await expect(auditRows(page).first()).toContainText("Test bulk entry");
    await expect(page.getByRole("group", { name: "Active filters" })).toContainText("Action: Test bulk entry");
  });
});
