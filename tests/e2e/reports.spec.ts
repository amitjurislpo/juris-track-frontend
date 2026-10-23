import { readFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { apiSession, expectLanded, login, MAXIMUM_EXPORT_ROWS, sql, SUPER_ADMIN_EMAIL, tableRows, toastWith } from "./helpers";

// Module 5.5 (reports and the CSV export): the manager's and the owner's report pages, their filters, the summary tabs and the
// CSV download. The tests run in order against one new business per run (unique names and emails), set up through the real API;
// workdays in the past are written straight into the e2e database (the API only records the present).

const RUN = Date.now().toString();
const BUSINESS_NAME = `Ledger ${RUN}`;
const BUSINESS_TIME_ZONE = "Asia/Kolkata";
const DISPLAY_TIME_ZONE = "America/New_York";
const person = (firstName: string, lastName: string, emailName: string, employeeCode?: string) =>
  ({ firstName, lastName, email: `${emailName}.${RUN}@ledger.test`, ...(employeeCode ? { employeeCode } : {}) });
const OWNER = person("Olga", "Owner", "owner");
const MAYA = person("Maya", "Manager", "maya", `MAYA${RUN}`);
const MOHAN = person("Mohan", "Midlevel", "mohan", `MOHAN${RUN}`);
const ASHA = person("Asha", "Arora", "asha", `ASHA${RUN}`);
const BEN = person("Ben", "Bose", "ben", `BEN${RUN}`);
const CHEN = person("Chen", "Chawla", "chen", `CHEN${RUN}`);
const FORMULA = person("=cmd", '|calc, "x"', "formula");
const NORA = person("Nora", "Nomanager", "nora");
const BULK = person("Bulk", "Bulkley", "bulk");
const name = (somebody: { firstName: string; lastName: string }) => `${somebody.firstName} ${somebody.lastName}`;

const ids: Record<string, string> = {};

/** A calendar date in the business time zone, `daysAgo` days before today. */
function businessDate(daysAgo: number): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}
const TODAY = businessDate(0);
const RANGE_FROM = businessDate(4);
/** The report of the last five days (four days ago to today), so the data never depends on the weekday the tests run on. */
const LAST_FIVE_DAYS = `range=custom&from=${RANGE_FROM}&to=${TODAY}`;

/** A business-zone wall clock time on `date` as an instant. */
const at = (date: string, wallClock: string) => `${date}T${wallClock}:00+05:30`;

/** "09:00" of a business-zone wall clock time on `date`, shown in another zone. */
function clockIn(timeZone: string, date: string, wallClock: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(at(date, wallClock)));
}

/** The zone's abbreviation now, as the API writes it into the CSV header (EDT in summer, EST in winter for New York). */
const newYorkAbbreviation = () =>
  new Intl.DateTimeFormat("en-US", { timeZone: DISPLAY_TIME_ZONE, timeZoneName: "short" }).formatToParts(new Date()).find((part) => part.type === "timeZoneName")?.value;

/** A finished workday written into the database: intervals as [type, from, to] business-zone wall clock times, with the manager of the day. */
async function insertEndedWorkday(employeeId: string, managerId: string | null, date: string, intervals: ["WORK" | "BREAK", string, string][]) {
  const seconds = (type: "WORK" | "BREAK") =>
    intervals.filter(([intervalType]) => intervalType === type).reduce((total, [, from, to]) => total + (Date.parse(at(date, to)) - Date.parse(at(date, from))) / 1000, 0);
  const [workday] = await sql<{ id: string }>(
    `INSERT INTO workdays (business_id, employee_id, manager_id, work_date, time_zone, started_at, ended_at, status, productive_seconds, break_seconds, break_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'COMPLETED', $8, $9, $10) RETURNING id`,
    [ids.business, employeeId, managerId, date, BUSINESS_TIME_ZONE, at(date, intervals[0][1]), at(date, intervals[intervals.length - 1][2]), seconds("WORK"), seconds("BREAK"),
      intervals.filter(([type]) => type === "BREAK").length],
  );
  for (const [type, from, to] of intervals) {
    await sql(`INSERT INTO ${type === "WORK" ? "work_sessions" : "break_sessions"} (business_id, employee_id, workday_id, started_at, ended_at) VALUES ($1, $2, $3, $4, $5)`,
      [ids.business, employeeId, workday.id, at(date, from), at(date, to)]);
  }
}

/** "7h 05m 03s" / "3m 09s" / "42s" -> seconds. */
function parseDuration(text: string): number {
  const part = (unit: string) => Number(new RegExp(`(\\d+)${unit}`).exec(text)?.[1] ?? 0);
  return part("h") * 3600 + part("m") * 60 + part("s");
}

/** The texts of one column of the report table, found by its header. */
async function columnTexts(page: Page, header: string | RegExp): Promise<string[]> {
  const headers = await page.locator("table.t thead th").allTextContents();
  const index = headers.findIndex((text) => (typeof header === "string" ? text.replace(/[↑↓↕]/g, "").trim() === header : header.test(text)));
  expect(index, `column ${String(header)}`).toBeGreaterThanOrEqual(0);
  return (await tableRows(page).locator(`td:nth-child(${index + 1})`).allTextContents()).map((text) => text.trim());
}

/** The value of a totals card. */
const totalCard = (page: Page, label: string): Locator =>
  page.getByRole("list", { name: /^Totals of/ }).getByRole("listitem").filter({ has: page.locator(".l", { hasText: new RegExp(`^${label}$`) }) }).locator(".v");

/** Whether the numbers are in order (ascending or descending). */
const isSorted = (values: number[], direction: "asc" | "desc") =>
  values.every((value, i) => i === 0 || (direction === "asc" ? values[i - 1] <= value : values[i - 1] >= value));

const rowCount = (page: Page) => page.locator(".report-card .tcount");

/** Waits for the report of the current URL to be on screen. */
async function openReport(page: Page, url: string) {
  await page.goto(url);
  await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
  await expect(rowCount(page)).toBeVisible();
}

/** Clicks "Export CSV" and reads the saved file. */
async function downloadCsv(page: Page) {
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const download = await downloading;
  const bytes = readFileSync((await download.path())!);
  return { fileName: download.suggestedFilename(), bytes, text: bytes.subarray(3).toString("utf8") };
}

test.describe.serial("reports", () => {
  test.beforeAll(async () => {
    const superAdmin = await apiSession(SUPER_ADMIN_EMAIL);
    const created = await superAdmin.post("/api/businesses", { data: { name: BUSINESS_NAME, timeZone: BUSINESS_TIME_ZONE, owner: OWNER } });
    expect(created.status()).toBe(201);
    ids.business = (await created.json()).data.id;
    await superAdmin.dispose();

    const owner = await apiSession(OWNER.email);
    expect((await owner.patch("/api/business", { data: { displayTimeZones: [DISPLAY_TIME_ZONE] } })).status()).toBe(200);
    const addEmployee = async (employee: ReturnType<typeof person>, role: "EMPLOYEE" | "MANAGER", managerId?: string) => {
      const answer = await owner.post("/api/employees", { data: { ...employee, role, ...(managerId ? { managerId } : {}) } });
      expect(answer.status(), await answer.text()).toBe(201);
      return (await answer.json()).data.id as string;
    };
    // Maya manages Asha, Ben, the "=cmd" employee and Mohan; Mohan (a manager) manages Chen, so Chen is Maya's indirect report
    ids.maya = await addEmployee(MAYA, "MANAGER");
    ids.mohan = await addEmployee(MOHAN, "MANAGER", ids.maya);
    ids.asha = await addEmployee(ASHA, "EMPLOYEE", ids.maya);
    ids.ben = await addEmployee(BEN, "EMPLOYEE", ids.maya);
    ids.formula = await addEmployee(FORMULA, "EMPLOYEE", ids.maya);
    ids.chen = await addEmployee(CHEN, "EMPLOYEE", ids.mohan);
    ids.nora = await addEmployee(NORA, "EMPLOYEE");
    ids.bulk = await addEmployee(BULK, "EMPLOYEE");
    await owner.dispose();

    // the last five days (D1 = yesterday): 8 workdays for Maya's direct reports, 10 with the indirect ones, 11 for the owner
    await insertEndedWorkday(ids.asha, ids.maya, businessDate(1), [["WORK", "09:00", "13:00"], ["BREAK", "13:00", "13:30"], ["WORK", "13:30", "17:30"]]);
    await insertEndedWorkday(ids.asha, ids.maya, businessDate(2), [["WORK", "10:00", "16:00"]]);
    await insertEndedWorkday(ids.ben, ids.maya, businessDate(1), [["WORK", "08:00", "12:00"]]);
    await insertEndedWorkday(ids.ben, ids.maya, businessDate(3), [["WORK", "09:00", "11:00"], ["BREAK", "11:00", "12:00"], ["WORK", "12:00", "15:00"]]);
    await insertEndedWorkday(ids.formula, ids.maya, businessDate(2), [["WORK", "09:00", "12:00"]]);
    await insertEndedWorkday(ids.mohan, ids.maya, businessDate(1), [["WORK", "10:00", "14:00"]]);
    await insertEndedWorkday(ids.chen, ids.mohan, businessDate(1), [["WORK", "11:00", "18:00"]]);
    await insertEndedWorkday(ids.nora, null, businessDate(1), [["WORK", "09:30", "11:30"]]);
    // Chen left a day open three days ago: "Not ended" (open far longer than the stale workday hours)
    const [openDay] = await sql<{ id: string }>(
      `INSERT INTO workdays (business_id, employee_id, manager_id, work_date, time_zone, started_at, status, active_employee_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'WORKING', $2) RETURNING id`, [ids.business, ids.chen, ids.mohan, businessDate(3), BUSINESS_TIME_ZONE, at(businessDate(3), "09:00")]);
    await sql("INSERT INTO work_sessions (business_id, employee_id, workday_id, started_at, open_workday_id) VALUES ($1, $2, $3, $4, $3)",
      [ids.business, ids.chen, openDay.id, at(businessDate(3), "09:00")]);
    // 45 short days long ago (40 to 84 days back), only to make an export larger than the e2e cap
    await sql(
      `INSERT INTO workdays (business_id, employee_id, work_date, time_zone, started_at, ended_at, status, productive_seconds, break_seconds, break_count)
       SELECT $1, $2, day::date, $3, (day::date + time '09:00') AT TIME ZONE $3, (day::date + time '10:00') AT TIME ZONE $3, 'COMPLETED', 3600, 0, 0
       FROM generate_series($4::date, $5::date, interval '1 day') AS day`, [ids.business, ids.bulk, BUSINESS_TIME_ZONE, businessDate(84), businessDate(40)]);

    // today, through the real API: Asha is working, Ben is on a break
    const asha = await apiSession(ASHA.email);
    expect((await asha.post("/api/me/time-events", { data: { type: "START" } })).status()).toBeLessThan(300);
    await asha.dispose();
    const ben = await apiSession(BEN.email);
    expect((await ben.post("/api/me/time-events", { data: { type: "START" } })).status()).toBeLessThan(300);
    expect((await ben.post("/api/me/time-events", { data: { type: "BREAK" } })).status()).toBeLessThan(300);
    await ben.dispose();
  });

  test("a manager's report shows their direct reports by default and also the indirect ones after the switch", async ({ page }) => {
    await login(page, MAYA.email);
    await expectLanded(page, "/team");
    await openReport(page, `/team/reports?${LAST_FIVE_DAYS}`);
    await expect(page.getByText("Team", { exact: true }).first()).toBeVisible();
    await expect(rowCount(page)).toHaveText("8 workdays");
    const directNames = new Set(await columnTexts(page, "Employee"));
    for (const somebody of [ASHA, BEN, MOHAN, FORMULA]) expect([...directNames].some((text) => text.startsWith(name(somebody))), name(somebody)).toBe(true);
    expect([...directNames].some((text) => text.startsWith(name(CHEN)) || text.startsWith(name(NORA)))).toBe(false);
    // the employee code is under the name, the manager of the day next to it
    await expect(tableRows(page).filter({ hasText: name(ASHA) }).first()).toContainText(ASHA.employeeCode!);
    expect(new Set(await columnTexts(page, "Manager"))).toEqual(new Set([name(MAYA)]));
    // today's live days: working and on a break
    await expect(tableRows(page).filter({ hasText: name(ASHA) }).first().locator(".chip")).toHaveText("Working");
    await expect(tableRows(page).filter({ hasText: name(BEN) }).first().locator(".chip")).toHaveText("On break");

    await page.getByRole("group", { name: "People" }).getByRole("button", { name: "Include indirect reports" }).click();
    await expect(page).toHaveURL(/scope=indirect/);
    await expect(rowCount(page)).toHaveText("10 workdays");
    const chenRows = tableRows(page).filter({ hasText: name(CHEN) });
    await expect(chenRows).toHaveCount(2);
    await expect(chenRows.first()).toContainText(name(MOHAN));
    await expect(page.getByRole("region", { name: "Filters in use" })).toContainText("Include indirect reports");

    // "Clear all" goes back to the defaults (this week, direct reports)
    await page.getByRole("button", { name: "Clear all" }).click();
    await expect(page).toHaveURL(/\/team\/reports$/);
    await expect(page.getByRole("region", { name: "Filters in use" })).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Date range" }).getByRole("button", { name: "This week" })).toHaveAttribute("aria-pressed", "true");
  });

  test("the owner sees everybody; the totals equal the rows; the summaries by employee, manager and day", async ({ page }) => {
    await login(page, OWNER.email);
    await expectLanded(page, "/admin");
    await openReport(page, `/admin/reports?${LAST_FIVE_DAYS}&status=DAY_ENDED`);
    await expect(rowCount(page)).toHaveText("8 workdays");
    const productive = (await columnTexts(page, "Productive")).map(parseDuration);
    const breaks = (await columnTexts(page, "Break")).map(parseDuration);
    const spans = (await columnTexts(page, "Span")).map(parseDuration);
    const breakCounts = (await columnTexts(page, "Breaks")).map(Number);
    const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
    expect(sum(productive)).toBe(4 * 3600 + 4 * 3600 + 6 * 3600 + 4 * 3600 + 5 * 3600 + 3 * 3600 + 4 * 3600 + 7 * 3600 + 2 * 3600);
    await expect(totalCard(page, "Workdays")).toHaveText("8");
    expect(parseDuration((await totalCard(page, "Productive").textContent())!)).toBe(sum(productive));
    expect(parseDuration((await totalCard(page, "Break").textContent())!)).toBe(sum(breaks));
    expect(parseDuration((await totalCard(page, "Span").textContent())!)).toBe(sum(spans));
    await expect(totalCard(page, "Breaks")).toHaveText(String(sum(breakCounts)));
    const people = new Set((await columnTexts(page, "Employee")).map((text) => text.replace(/[A-Z]+\d+$/, "")));
    await expect(totalCard(page, "People")).toHaveText(String(people.size));
    expect(parseDuration((await totalCard(page, "Average per workday").textContent())!)).toBe(Math.round(sum(productive) / 8));
    // the chart has one labelled column per day of the range
    await expect(page.getByRole("group", { name: /^Productive and break time per day/ }).getByRole("img")).toHaveCount(5);

    // everybody of the business, the open days included
    await page.getByRole("button", { name: /^Remove filter: Status: Day ended/ }).click();
    await expect(rowCount(page)).toHaveText("11 workdays");
    await expect(tableRows(page).filter({ hasText: name(NORA) })).toHaveCount(1);
    await expect(tableRows(page).filter({ hasText: name(NORA) })).toContainText("No manager");

    // By employee: one group per person
    await page.getByRole("tab", { name: "By employee" }).click();
    await expect(page).toHaveURL(/groupBy=employee/);
    await expect(rowCount(page)).toHaveText("6 groups");
    await expect(page.getByRole("tab", { name: "By employee" })).toHaveAttribute("aria-selected", "true");
    // keyboard: the arrow key opens the next tab (By manager)
    await page.getByRole("tab", { name: "By employee" }).press("ArrowRight");
    await expect(page).toHaveURL(/groupBy=manager/);
    await expect(page.getByRole("tab", { name: "By manager" })).toBeFocused();
    await expect(rowCount(page)).toHaveText("3 groups");
    const managerLabels = await columnTexts(page, "Manager");
    expect(managerLabels).toEqual([name(MAYA), name(MOHAN), "No manager"]);
    const mayaGroup = tableRows(page).filter({ hasText: name(MAYA) });
    expect(Number((await mayaGroup.locator("td").nth(1).textContent())!.trim())).toBe(8);
    expect(Number((await mayaGroup.locator("td").nth(2).textContent())!.trim())).toBe(4);
    // sorting a summary: the "No manager" group stays last in both directions
    await page.getByRole("button", { name: /^Manager/ }).click();
    await expect(page).toHaveURL(/sort=label&sortDirection=desc/);
    await expect.poll(() => columnTexts(page, "Manager")).toEqual([name(MOHAN), name(MAYA), "No manager"]);

    // End opens the last tab (By day): one group per date with workdays, newest first
    await page.getByRole("tab", { name: "By manager" }).press("End");
    await expect(page).toHaveURL(/groupBy=date/);
    await expect(rowCount(page)).toHaveText("4 groups");
    const dates = await columnTexts(page, "Date");
    expect(dates[0]).toContain(new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(new Date(`${TODAY}T00:00:00Z`)));
    await expect(page.locator("table.t thead")).toContainText("First start (IST)");
    await page.getByRole("button", { name: /^Productive/ }).click();
    await expect(page).toHaveURL(/sort=productiveSeconds&sortDirection=asc/);
    await expect.poll(async () => isSorted((await columnTexts(page, "Productive")).map(parseDuration), "asc")).toBe(true);

    // back to the workdays: the summary's sorting is dropped
    await page.getByRole("tab", { name: "Workdays" }).click();
    await expect(page).not.toHaveURL(/groupBy|sort=/);
    await expect(rowCount(page)).toHaveText("11 workdays");
  });

  test("sorting, paging and the filters: range, status, search, employee; a custom range is checked", async ({ page }) => {
    await login(page, OWNER.email);
    await expectLanded(page, "/admin");
    await openReport(page, `/admin/reports?${LAST_FIVE_DAYS}&pageSize=4`);
    await expect(page.getByRole("navigation", { name: "Pages" })).toContainText("1–4 of 11");
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByRole("navigation", { name: "Pages" })).toContainText("5–8 of 11");
    // sorting goes back to page 1, smallest productive time first
    await page.getByRole("button", { name: /^Productive/ }).click();
    await expect(page).toHaveURL(/sort=productiveSeconds&sortDirection=asc/);
    await expect(page).not.toHaveURL(/page=2/);
    await expect.poll(async () => isSorted((await columnTexts(page, "Productive")).map(parseDuration), "asc")).toBe(true);
    await page.getByRole("button", { name: /^Productive/ }).click();
    await expect(page).toHaveURL(/sortDirection=desc/);
    await expect.poll(async () => isSorted((await columnTexts(page, "Productive")).map(parseDuration), "desc")).toBe(true);
    // the open stale day has run for days: it is the largest
    await expect(tableRows(page).first()).toContainText(name(CHEN));
    await expect(tableRows(page).first()).toContainText("Not ended");

    // range presets
    await openReport(page, "/admin/reports");
    await page.getByRole("group", { name: "Date range" }).getByRole("button", { name: "Yesterday" }).click();
    await expect(page).toHaveURL(/range=yesterday/);
    await expect(rowCount(page)).toHaveText("5 workdays");
    expect(new Set(await columnTexts(page, "Date")).size).toBe(1);
    await page.getByRole("group", { name: "Date range" }).getByRole("button", { name: "Today" }).click();
    await expect(rowCount(page)).toHaveText("2 workdays");
    // the single-day report has no chart
    await expect(page.getByRole("group", { name: /^Productive and break time per day/ })).toHaveCount(0);

    // a custom range is checked before it is used
    await page.getByRole("group", { name: "Date range" }).getByRole("button", { name: "Custom range" }).click();
    await expect(page).toHaveURL(/range=custom/);
    await page.getByLabel("From date").fill(TODAY);
    await page.getByLabel("To date").fill(RANGE_FROM);
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "The start date must be on or before the end date." })).toBeVisible();
    await page.getByLabel("From date").fill("2020-01-01");
    await page.getByLabel("To date").fill(TODAY);
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Choose at most 366 days." })).toBeVisible();
    await expect(page).not.toHaveURL(/from=2020/);
    await page.getByLabel("From date").fill(RANGE_FROM);
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(new RegExp(`from=${RANGE_FROM}&to=${TODAY}`));
    await expect(rowCount(page)).toHaveText("11 workdays");

    // status: Not ended (the stale open day), then also On break
    const statuses = page.getByRole("group", { name: "Status" });
    await statuses.getByRole("button", { name: "Not ended" }).click();
    await expect(page).toHaveURL(/status=NOT_ENDED/);
    await expect(rowCount(page)).toHaveText("1 workday");
    await expect(tableRows(page)).toContainText(name(CHEN));
    await statuses.getByRole("button", { name: "On break" }).click();
    await expect(page).toHaveURL(/status=ON_BREAK%2CNOT_ENDED/);
    await expect(rowCount(page)).toHaveText("2 workdays");
    await statuses.getByRole("button", { name: "Not ended" }).click();
    await statuses.getByRole("button", { name: "On break" }).click();
    await expect(page).not.toHaveURL(/status=/);

    // search
    await page.getByRole("searchbox", { name: "Search people" }).fill("chawla");
    await expect(page).toHaveURL(/search=chawla/);
    await expect(rowCount(page)).toHaveText("2 workdays");
    await page.getByRole("button", { name: "Remove filter: Search: chawla" }).click();
    await expect(rowCount(page)).toHaveText("11 workdays");

    // employee picker: search by name, choose with the keyboard
    const picker = page.getByRole("combobox", { name: "Employee" });
    await picker.click();
    await picker.fill("Bos");
    const employeeOptions = page.getByRole("listbox", { name: "Employees" }).getByRole("option");
    const benOption = employeeOptions.filter({ hasText: name(BEN) });
    await expect(benOption).toBeVisible();
    await expect(employeeOptions).toHaveCount(2); // "Everyone" and Ben
    await picker.press("ArrowDown");
    await picker.press("Enter");
    await expect(page).toHaveURL(new RegExp(`employeeId=${ids.ben}`));
    await expect(rowCount(page)).toHaveText("3 workdays");
    expect(new Set(await columnTexts(page, "Employee")).size).toBe(1);
    await expect(picker).toHaveValue(name(BEN));
    await expect(page.getByRole("region", { name: "Filters in use" })).toContainText(`Employee: ${name(BEN)}`);
    // after a reload the name comes from the API
    await page.reload();
    await expect(page.getByRole("combobox", { name: "Employee" })).toHaveValue(name(BEN));
    await page.getByRole("button", { name: "Show everyone" }).click();
    await expect(page).not.toHaveURL(/employeeId/);

    // the owner's manager filter: workdays whose manager of the day was Mohan
    await page.getByRole("combobox", { name: /^Manager/ }).selectOption(ids.mohan);
    await expect(rowCount(page)).toHaveText("2 workdays");
    await expect(page.getByRole("region", { name: "Filters in use" })).toContainText(`Manager: ${name(MOHAN)}`);
  });

  test("the CSV export: the current filters, BOM, CRLF, the zone in the header, the formula guard; the display time zone changes it", async ({ page }) => {
    await login(page, MAYA.email);
    await expectLanded(page, "/team");
    await openReport(page, `/team/reports?${LAST_FIVE_DAYS}`);
    await expect(page.getByText(`The file is in English, with times in IST (${BUSINESS_TIME_ZONE}).`)).toBeVisible();
    const csv = await downloadCsv(page);
    expect(csv.fileName).toBe(`juristrack-${RANGE_FROM}-to-${TODAY}.csv`);
    expect([...csv.bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(csv.text.endsWith("\r\n")).toBe(true);
    const lines = csv.text.slice(0, -2).split("\r\n");
    expect(lines.every((line) => !line.includes("\n"))).toBe(true);
    expect(lines[0]).toBe("Date,Employee,Employee ID,Manager,Status,Start (IST),End (IST),Productive hours,Break hours,Span hours,Breaks");
    expect(lines).toHaveLength(1 + 8);
    expect(lines.find((line) => line.includes("'=cmd"))).toBe(`${businessDate(2)},"'=cmd |calc, ""x""",,${name(MAYA)},Day Ended,09:00,12:00,3.00,0.00,3.00,0`);
    expect(lines).toContain(`${businessDate(1)},${name(ASHA)},${ASHA.employeeCode},${name(MAYA)},Day Ended,09:00,17:30,8.00,0.50,8.50,1`);
    expect(lines.filter((line) => line.includes(name(CHEN)))).toHaveLength(0);
    await expect(toastWith(page, "The CSV file is downloading.")).toBeVisible();

    // the filters of the page go with it (indirect reports, only open days)
    await openReport(page, `/team/reports?${LAST_FIVE_DAYS}&scope=indirect&status=NOT_ENDED`);
    const filtered = await downloadCsv(page);
    const filteredLines = filtered.text.slice(0, -2).split("\r\n");
    expect(filteredLines).toHaveLength(2);
    expect(filteredLines[1]).toMatch(new RegExp(`^${businessDate(3)},${name(CHEN)},${CHEN.employeeCode},${name(MOHAN)},Not ended,09:00,,`));

    // another display time zone: the table and the file show New York times
    const abbreviation = newYorkAbbreviation()!;
    await openReport(page, `/team/reports?${LAST_FIVE_DAYS}`);
    await page.getByLabel("Show times in").selectOption(DISPLAY_TIME_ZONE);
    await expect(page.locator("table.t thead")).toContainText(`Start (${abbreviation})`);
    const ashaRow = tableRows(page).filter({ hasText: name(ASHA) }).filter({ hasText: "8h 00m 00s" });
    await expect(ashaRow).toContainText(clockIn(DISPLAY_TIME_ZONE, businessDate(1), "09:00"));
    await expect(page.getByText(`The file is in English, with times in ${abbreviation} (${DISPLAY_TIME_ZONE}).`)).toBeVisible();
    const newYork = await downloadCsv(page);
    const newYorkLines = newYork.text.slice(0, -2).split("\r\n");
    expect(newYorkLines[0]).toBe(`Date,Employee,Employee ID,Manager,Status,Start (${abbreviation}),End (${abbreviation}),Productive hours,Break hours,Span hours,Breaks`);
    expect(newYorkLines).toContain(`${businessDate(1)},${name(ASHA)},${ASHA.employeeCode},${name(MAYA)},Day Ended,${clockIn(DISPLAY_TIME_ZONE, businessDate(1), "09:00")},${clockIn(DISPLAY_TIME_ZONE, businessDate(1), "17:30")},8.00,0.50,8.50,1`);
    await page.getByLabel("Show times in").selectOption(BUSINESS_TIME_ZONE);
  });

  test(`an export of more than ${MAXIMUM_EXPORT_ROWS} rows is refused with a clear message; the report itself still shows`, async ({ page }) => {
    await login(page, OWNER.email);
    await expectLanded(page, "/admin");
    await openReport(page, `/admin/reports?range=custom&from=${businessDate(90)}&to=${TODAY}`);
    await expect(rowCount(page)).toHaveText("56 workdays");
    let hasDownloaded = false;
    page.on("download", () => { hasDownloaded = true; });
    await page.getByRole("button", { name: "Export CSV" }).click();
    await expect(toastWith(page, "This export has too many rows for one file. Narrow the date range or choose fewer people, then export again.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Export CSV" })).toBeEnabled();
    expect(hasDownloaded).toBe(false);
  });

  test("employees and the super admin cannot open the reports and the API refuses them; a manager is refused everybody and people outside their line", async ({ page, browser }) => {
    await login(page, ASHA.email);
    await expectLanded(page, "/dashboard");
    for (const path of ["/team/reports", "/admin/reports"]) {
      await page.goto(path);
      await expectLanded(page, "/dashboard");
    }
    expect((await page.request.get("/api/reports/workdays")).status()).toBe(403);
    expect((await page.request.get("/api/reports/summaries")).status()).toBe(403);
    expect((await page.request.get("/api/reports/workdays", { headers: { Accept: "text/csv" } })).status()).toBe(403);

    const superAdminContext = await browser.newContext();
    const superAdminPage = await superAdminContext.newPage();
    await login(superAdminPage, SUPER_ADMIN_EMAIL);
    await expectLanded(superAdminPage, "/platform");
    await superAdminPage.goto("/admin/reports");
    await expectLanded(superAdminPage, "/platform");
    expect((await superAdminPage.request.get("/api/reports/workdays")).status()).toBe(403);
    expect((await superAdminPage.request.get("/api/reports/summaries")).status()).toBe(403);
    await superAdminContext.close();

    const managerContext = await browser.newContext();
    const managerPage = await managerContext.newPage();
    await login(managerPage, MAYA.email);
    await expectLanded(managerPage, "/team");
    await managerPage.goto("/admin/reports");
    await expectLanded(managerPage, "/team");
    expect((await managerPage.request.get("/api/reports/workdays?scope=all")).status()).toBe(403);
    await managerPage.goto("/team/reports?scope=all");
    await expect(managerPage.getByRole("alert")).toContainText("You can't see this report");
    await expect(managerPage.getByRole("alert")).toContainText("You can see only the people who report to you.");
    // somebody outside the reporting line is "not found", like an unknown id
    expect((await managerPage.request.get(`/api/reports/workdays?employeeId=${ids.nora}`)).status()).toBe(404);
    await managerPage.goto(`/team/reports?employeeId=${ids.nora}`);
    await expect(managerPage.getByRole("alert")).toContainText("Not in your report");
    await managerPage.getByRole("alert").getByRole("button", { name: "Clear filters" }).click();
    await expect(managerPage).toHaveURL(/\/team\/reports$/);
    await expect(managerPage.locator(".report-card .tcount")).toBeVisible();
    // a bad parameter names what was wrong
    await managerPage.goto("/team/reports?groupBy=employee&sort=label&sortDirection=desc&pageSize=500");
    await expect(managerPage.getByRole("alert")).toContainText("Some filters are not valid");
    await expect(managerPage.getByRole("alert")).toContainText("pageSize must be a whole number between 1 and 100.");
    await managerContext.close();
  });

  test("on a phone the report fits the screen: no sideways page scroll, the wide table scrolls in its own box", async ({ page }) => {
    await login(page, OWNER.email);
    await expectLanded(page, "/admin");
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 800 });
      await openReport(page, `/admin/reports?${LAST_FIVE_DAYS}&status=DAY_ENDED`);
      await expect(rowCount(page)).toHaveText("8 workdays");
      await page.getByRole("combobox", { name: "Employee" }).click();
      await expect(page.getByRole("listbox", { name: "Employees" })).toBeVisible();
      await page.keyboard.press("Escape");
      const sizes = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      expect(sizes.scrollWidth, `page width at ${width}px`).toBeLessThanOrEqual(sizes.clientWidth);
      const tableBox = await page.locator(".report-card .table-wrap").evaluate((element) => ({ scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }));
      expect(tableBox.scrollWidth).toBeGreaterThan(tableBox.clientWidth);
      await expect(page.getByRole("button", { name: "Export CSV" })).toBeInViewport();
      await expect(page.getByRole("tab", { name: "Workdays" })).toBeVisible();
    }
    await page.setViewportSize({ width: 1280, height: 800 });
    await openReport(page, `/admin/reports?${LAST_FIVE_DAYS}`);
    const desktop = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    expect(desktop).toBe(true);
  });
});
