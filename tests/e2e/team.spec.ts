import { expect, test, type Locator, type Page } from "@playwright/test";
import { apiSession, expectLanded, login, renewSession, signInElsewhere, sql, SUPER_ADMIN_EMAIL, tableRows, toastWith, WEB_ORIGIN } from "./helpers";

// Module 4 (Team tab and time corrections): the manager's live board and the owner's Time Tracking, one person's page with
// their history, and the corrections of their workdays. The tests run in order against one new business per run (unique names
// and emails), set up through the real API: a three-level reporting line, a second manager with their own report, a manager
// without reports.

const RUN = Date.now().toString();
const BUSINESS_NAME = `Teamwork ${RUN}`;
const BUSINESS_TIME_ZONE = "Asia/Kolkata";
const person = (firstName: string, lastName: string, emailName: string) => ({ firstName, lastName, email: `${emailName}.${RUN}@teamwork.test` });
const OWNER = person("Olive", "Owner", "owner");
const LEAD = person("Lena", "Lead", "lead");
const MIDDLE = person("Mia", "Middle", "middle");
const WORKER = person("Wen", "Worker", "worker");
const ARCHIE = person("Archie", "Alpha", "archie");
const FORGETFUL = person("Fay", "Forgetful", "forgetful");
const LEAVER = person("Leo", "Leaver", "leaver");
const INDIRECT = person("Ivy", "Indirect", "indirect");
const OTHER_MANAGER = person("Oscar", "Other", "othermanager");
const OTHER_WORKER = person("Olga", "Other", "otherworker");
const LONE_MANAGER = person("Nora", "Nobody", "lonemanager");

/** Lena Lead's direct reports, and with "Include indirect reports" also Mia Middle's (Ivy Indirect). */
const DIRECT_REPORTS = [MIDDLE, WORKER, ARCHIE, FORGETFUL, LEAVER];
const OVERLAP_MESSAGE = "The corrected interval overlaps another work or break interval. Choose times that do not overlap.";

let businessId = "";
const userIds: Record<string, string> = {};

const fullNameOf = (somebody: { firstName: string; lastName: string }) => `${somebody.firstName} ${somebody.lastName}`;
const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
/** The board's row of a person (by the name column: their name also appears as the manager of others). */
const boardRow = (page: Page, somebody: { firstName: string; lastName: string }) =>
  tableRows(page).filter({ has: page.locator("td:first-child b", { hasText: fullNameOf(somebody) }) });
const tile = (page: Page, label: string, value: string | number) => page.getByRole("list", { name: "Team totals" }).getByRole("listitem", { name: `${label}: ${value}`, exact: true });
const rowTimer = (page: Page, somebody: { firstName: string; lastName: string }) => page.getByRole("timer", { name: `Productive time of ${fullNameOf(somebody)}` });
const timeStatus = (page: Page) => page.getByTestId("time-status");
const memberStatus = (page: Page) => page.getByTestId("member-status");

/** The seconds a timer shows (its `data-seconds`). */
const secondsOf = async (timer: Locator) => Number(await timer.getAttribute("data-seconds"));

/** Makes the app read its data again, as when the person comes back to the tab (TanStack Query refetches on visibility). */
const comeBackToTab = (page: Page) => page.evaluate(() => document.dispatchEvent(new Event("visibilitychange", { bubbles: true })));

/** A calendar date in the business time zone, `daysAgo` days before today. */
function businessDate(daysAgo: number): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}
const YESTERDAY = businessDate(1);
const businessInstant = (date: string, wallClock: string) => `${date}T${wallClock}:00+05:30`;

/** The value next to `label` in a figures list (design `.summary`). */
const figure = (scope: Locator, listLabel: string, label: string) =>
  scope.locator(`dl[aria-label="${listLabel}"] > div`).filter({ has: scope.page().locator("dt", { hasText: new RegExp(`^${label}$`) }) }).locator("dd");

/** A finished workday written straight into the database: intervals as [type, from, to] wall-clock times in the business time zone. */
async function insertEndedWorkday(employeeId: string, date: string, intervals: ["WORK" | "BREAK", string, string][]): Promise<string> {
  const at = (wallClock: string) => businessInstant(date, wallClock);
  const seconds = (type: "WORK" | "BREAK") =>
    intervals.filter(([intervalType]) => intervalType === type).reduce((total, [, from, to]) => total + (Date.parse(at(to)) - Date.parse(at(from))) / 1000, 0);
  const [workday] = await sql<{ id: string }>(
    `INSERT INTO workdays (business_id, employee_id, work_date, time_zone, started_at, ended_at, status, productive_seconds, break_seconds, break_count)
     VALUES ($1, $2, $3, $4, $5, $6, 'COMPLETED', $7, $8, $9) RETURNING id`,
    [businessId, employeeId, date, BUSINESS_TIME_ZONE, at(intervals[0][1]), at(intervals[intervals.length - 1][2]), seconds("WORK"), seconds("BREAK"),
      intervals.filter(([type]) => type === "BREAK").length],
  );
  for (const [type, from, to] of intervals) {
    await sql(`INSERT INTO ${type === "WORK" ? "work_sessions" : "break_sessions"} (business_id, employee_id, workday_id, started_at, ended_at) VALUES ($1, $2, $3, $4, $5)`,
      [businessId, employeeId, workday.id, at(from), at(to)]);
  }
  return workday.id;
}

/** Signs in and opens the board of the manager (or the owner's Time Tracking). */
async function openBoard(page: Page, email: string, landingPath: string, boardPath = landingPath) {
  await login(page, email);
  await expectLanded(page, landingPath);
  if (boardPath !== landingPath) await page.goto(boardPath);
  await expect(page.getByRole("list", { name: "Team totals" })).toBeVisible();
}

/** A time event of an employee in their own browser (My time). */
async function pressTimeButton(page: Page, name: string, expectedStatus: string) {
  await button(page, name).click();
  await expect(timeStatus(page)).toHaveText(expectedStatus);
}

const auditCount = async (action: string, actorEmail: string) =>
  Number((await sql<{ count: string }>("SELECT count(*) FROM audit_logs WHERE action = $1 AND actor_id = $2", [action, userIds[actorEmail]]))[0].count);

test.describe.serial("Team tab and time corrections", () => {
  test.beforeAll(async () => {
    const superAdmin = await apiSession(SUPER_ADMIN_EMAIL);
    const created = await superAdmin.post("/api/v1/businesses", { data: { name: BUSINESS_NAME, timeZone: BUSINESS_TIME_ZONE, owner: OWNER } });
    expect(created.status()).toBe(201);
    businessId = (await created.json()).data.id;
    await superAdmin.dispose();

    const owner = await apiSession(OWNER.email);
    const addEmployee = async (employee: typeof WORKER, role: "EMPLOYEE" | "MANAGER", manager?: typeof WORKER) => {
      const answer = await owner.post("/api/v1/employees", { data: { ...employee, role, ...(manager ? { managerId: userIds[manager.email] } : {}) } });
      expect(answer.status()).toBe(201);
      userIds[employee.email] = (await answer.json()).data.id as string;
    };
    // the reporting line: Lena Lead <- Mia Middle <- Ivy Indirect; Lena's other reports; Oscar Other <- Olga Other; Nora Nobody alone
    await addEmployee(LEAD, "MANAGER");
    await addEmployee(MIDDLE, "MANAGER", LEAD);
    for (const employee of [WORKER, ARCHIE, FORGETFUL, LEAVER]) await addEmployee(employee, "EMPLOYEE", LEAD);
    await addEmployee(INDIRECT, "EMPLOYEE", MIDDLE);
    await addEmployee(OTHER_MANAGER, "MANAGER");
    await addEmployee(OTHER_WORKER, "EMPLOYEE", OTHER_MANAGER);
    await addEmployee(LONE_MANAGER, "MANAGER");
    await owner.dispose();
    userIds[OWNER.email] = (await sql<{ id: string }>("SELECT id FROM users WHERE email = $1", [OWNER.email]))[0].id;

    // Archie's yesterday: 09:00-12:00 work, 12:00-12:30 break, 12:30-17:00 work (business time)
    await insertEndedWorkday(userIds[ARCHIE.email], YESTERDAY, [["WORK", "09:00", "12:00"], ["BREAK", "12:00", "12:30"], ["WORK", "12:30", "17:00"]]);
  });

  test("a manager's board shows their direct reports, and their reports' reports after the switch; a manager without reports sees an empty board", async ({ page }) => {
    await openBoard(page, LEAD.email, "/team");
    await expect(page.getByRole("heading", { name: "Team", level: 1 })).toBeVisible();
    await expect(tableRows(page)).toHaveCount(DIRECT_REPORTS.length);
    for (const report of DIRECT_REPORTS) await expect(boardRow(page, report)).toContainText("Not started");
    await expect(boardRow(page, INDIRECT)).toHaveCount(0);
    await expect(tile(page, "People", 5)).toBeVisible();
    await expect(tile(page, "Not started", 5)).toBeVisible();
    await expect(tile(page, "Working", 0)).toBeVisible();

    const indirectSwitch = page.getByRole("switch", { name: "Include indirect reports" });
    await expect(indirectSwitch).toHaveAttribute("aria-checked", "false");
    await indirectSwitch.click();
    await expect(page).toHaveURL(/[?&]scope=indirect/);
    await expect(indirectSwitch).toHaveAttribute("aria-checked", "true");
    await expect(tableRows(page)).toHaveCount(DIRECT_REPORTS.length + 1);
    await expect(boardRow(page, INDIRECT)).toContainText(fullNameOf(MIDDLE));
    await expect(tile(page, "People", 6)).toBeVisible();
    // a reload keeps the scope (it lives in the URL)
    await page.reload();
    await expect(tableRows(page)).toHaveCount(6);
    await indirectSwitch.click();
    await expect(page).not.toHaveURL(/scope=/);
    await expect(tableRows(page)).toHaveCount(5);

    const middlePage = await signInElsewhere(page.context().browser()!, MIDDLE.email, "/team");
    await expect(tableRows(middlePage)).toHaveCount(1);
    await expect(boardRow(middlePage, INDIRECT)).toBeVisible();
    await middlePage.context().close();

    const lonePage = await signInElsewhere(page.context().browser()!, LONE_MANAGER.email, "/team");
    await expect(lonePage.getByText("Nobody reports to you yet")).toBeVisible();
    await expect(tile(lonePage, "People", 0)).toBeVisible();
    await lonePage.context().close();
  });

  test("the board follows an employee's start, break and end in another browser; the timer runs while they work and stands still on a break", async ({ page, browser }) => {
    await openBoard(page, LEAD.email, "/team");
    const employeePage = await signInElsewhere(browser, WORKER.email, "/dashboard");
    await employeePage.goto("/my-time");
    await pressTimeButton(employeePage, "Start work", "Working");

    await comeBackToTab(page);
    await expect(boardRow(page, WORKER)).toContainText("Working");
    await expect(tile(page, "Working", 1)).toBeVisible();
    await expect(tile(page, "Not started", 4)).toBeVisible();
    await expect(boardRow(page, WORKER)).toContainText(/Started work · \d\d:\d\d [AP]M/);
    // the timer runs on the page's own (server-corrected) clock between two readings of the board
    const timer = rowTimer(page, WORKER);
    const firstReading = await secondsOf(timer);
    await expect.poll(() => secondsOf(timer), { timeout: 10_000 }).toBeGreaterThanOrEqual(firstReading + 2);

    await pressTimeButton(employeePage, "Take a break", "On break");
    await comeBackToTab(page);
    await expect(boardRow(page, WORKER)).toContainText("On break");
    await expect(boardRow(page, WORKER)).toContainText(/Break 00:00:\d\d/);
    await expect(boardRow(page, WORKER)).toContainText("1 break"); // how many breaks so far, next to their total
    await expect(boardRow(page, WORKER)).toContainText(/Last break \d\d:\d\d [AP]M · running/); // and when the last one started
    await expect(page.locator("table.t thead")).toContainText("Work started");
    await expect(page.locator("table.t thead")).toContainText("Last break");
    await expect(boardRow(page, WORKER).locator("td").nth(7)).toHaveText(/^\d\d:\d\d [AP]M · running$/); // its own column
    await expect(tile(page, "On break", 1)).toBeVisible();
    const pausedAt = await secondsOf(timer);
    await page.waitForTimeout(2_500);
    expect(await secondsOf(timer)).toBe(pausedAt);

    // without any action of the manager, the board reads itself again within 15 seconds
    await pressTimeButton(employeePage, "Back to work", "Working");
    await expect(boardRow(page, WORKER)).toContainText("Working", { timeout: 20_000 });

    await button(employeePage, "End workday").click();
    await employeePage.getByRole("dialog", { name: "End your workday?" }).getByRole("button", { name: "End workday" }).click();
    await expect(timeStatus(employeePage)).toHaveText("Day ended");
    await employeePage.context().close();
    await comeBackToTab(page);
    await expect(boardRow(page, WORKER)).toContainText("Day ended");
    await expect(tile(page, "Day ended", 1)).toBeVisible();
    await expect(tile(page, "Working", 0)).toBeVisible();
    const endedAt = await secondsOf(timer);
    expect(endedAt).toBeGreaterThan(0);
    await page.waitForTimeout(1_500);
    expect(await secondsOf(timer)).toBe(endedAt);
  });

  test("status filter, search, sorting and pages are kept in the URL", async ({ page }) => {
    await openBoard(page, LEAD.email, "/team", "/team?scope=indirect");
    await expect(tableRows(page)).toHaveCount(6);

    const statusFilter = page.getByRole("group", { name: "Status" });
    await statusFilter.getByRole("button", { name: "Day ended" }).click();
    await expect(page).toHaveURL(/status=DAY_ENDED/);
    await expect(tableRows(page)).toHaveCount(1);
    await expect(boardRow(page, WORKER)).toBeVisible();
    // the tiles keep counting everybody of the scope
    await expect(tile(page, "People", 6)).toBeVisible();
    await statusFilter.getByRole("button", { name: "Not started" }).click();
    await expect(tableRows(page)).toHaveCount(5);
    await statusFilter.getByRole("button", { name: "All" }).click();
    await expect(page).not.toHaveURL(/status=/);
    await expect(tableRows(page)).toHaveCount(6);

    await page.getByRole("searchbox", { name: "Search people" }).fill("archie");
    await expect(page).toHaveURL(/search=archie/);
    await expect(tableRows(page)).toHaveCount(1);
    await expect(boardRow(page, ARCHIE)).toBeVisible();
    await page.getByRole("searchbox", { name: "Search people" }).fill(`othermanager.${RUN}`);
    await expect(page.getByText("No one matches")).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(tableRows(page)).toHaveCount(6);

    // by name: Archie first ascending, Wen first descending
    await expect(tableRows(page).first()).toContainText(fullNameOf(ARCHIE));
    await page.getByRole("button", { name: /^Name/ }).click();
    await expect(page).toHaveURL(/sort=name&sortDirection=desc/);
    await expect(tableRows(page).first()).toContainText(fullNameOf(WORKER));
    // by productive time, most first: Wen is the only one with time today
    await page.getByRole("button", { name: /^Productive/ }).click();
    await page.getByRole("button", { name: /^Productive/ }).click();
    await expect(page).toHaveURL(/sort=productiveSeconds&sortDirection=desc/);
    await expect(tableRows(page).first()).toContainText(fullNameOf(WORKER));

    await page.goto("/team?scope=indirect&pageSize=2");
    await expect(tableRows(page)).toHaveCount(2);
    await expect(page.getByRole("navigation", { name: "Pages" })).toContainText("1–2 of 6");
    await expect(tableRows(page).first()).toContainText(fullNameOf(ARCHIE));
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByRole("navigation", { name: "Pages" })).toContainText("3–4 of 6");
    await expect(tableRows(page).first()).toContainText(fullNameOf(INDIRECT));
  });

  test("the owner sees everybody, can narrow the board to their own reporting line, and opens a person from it", async ({ page }) => {
    await openBoard(page, OWNER.email, "/admin", "/admin/time-tracking");
    await expect(page.getByRole("heading", { name: "Time Tracking", level: 1 })).toBeVisible();
    const everybodyCount = Object.keys(userIds).length - 1;
    await expect(tableRows(page)).toHaveCount(everybodyCount);
    await expect(tile(page, "People", everybodyCount)).toBeVisible();
    for (const somebody of [LEAD, INDIRECT, OTHER_WORKER, LONE_MANAGER]) await expect(boardRow(page, somebody)).toBeVisible();
    await expect(page.getByRole("switch", { name: "Include indirect reports" })).toHaveCount(0);

    // nobody reports to the owner directly here
    await page.getByRole("group", { name: "Show" }).getByRole("button", { name: "My direct reports" }).click();
    await expect(page).toHaveURL(/scope=direct/);
    await expect(page.getByText("Nobody reports to you yet")).toBeVisible();
    await page.getByRole("group", { name: "Show" }).getByRole("button", { name: "Everybody" }).click();
    await expect(page).not.toHaveURL(/scope=/);

    await boardRow(page, WORKER).click();
    await expect(page).toHaveURL(new RegExp(`/admin/time-tracking/${userIds[WORKER.email]}$`));
    await expect(page.getByRole("heading", { name: fullNameOf(WORKER), level: 1 })).toBeVisible();
    await expect(page.getByText(`Reports to ${fullNameOf(LEAD)}`)).toBeVisible();
    await expect(memberStatus(page)).toHaveText("Day ended");
    await expect(page.getByRole("link", { name: "Edit employee" })).toBeVisible();

    // the employee's administration page links to their time
    await page.goto(`/admin/employees/${userIds[ARCHIE.email]}`);
    await page.getByRole("link", { name: "Time and history" }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/time-tracking/${userIds[ARCHIE.email]}$`));
    await expect(page.getByRole("heading", { name: fullNameOf(ARCHIE), level: 1 })).toBeVisible();
  });

  test("the board and a person's page fit a phone (390 and 320 px) without sideways scrolling", async ({ page }) => {
    await openBoard(page, LEAD.email, "/team");
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 800 });
      for (const path of ["/team?scope=indirect", `/team/employees/${userIds[ARCHIE.email]}`]) {
        await page.goto(path);
        await expect(page.locator("h1")).toBeVisible();
        await page.waitForTimeout(300);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${path} at ${width} px`).toBeLessThanOrEqual(0);
      }
    }
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test("an employee cannot open the Team pages, and the API refuses them", async ({ page }) => {
    await login(page, WORKER.email);
    await expectLanded(page, "/dashboard");
    for (const path of ["/team", `/team/employees/${userIds[ARCHIE.email]}`, "/admin/time-tracking", `/admin/time-tracking/${userIds[ARCHIE.email]}`]) {
      await page.goto(path);
      await expectLanded(page, "/dashboard");
    }
    const [archieWorkday] = await sql<{ id: string }>("SELECT id FROM workdays WHERE employee_id = $1", [userIds[ARCHIE.email]]);
    await renewSession(page);
    for (const answer of [
      await page.request.get("/api/v1/team/members"),
      await page.request.get(`/api/v1/team/members/${userIds[ARCHIE.email]}`),
      await page.request.get(`/api/v1/team/members/${userIds[ARCHIE.email]}/workdays`),
      await page.request.put(`/api/v1/workdays/${archieWorkday.id}/status`, { data: { status: "DAY_ENDED", reason: "Not my business" }, headers: { Origin: WEB_ORIGIN } }),
    ]) {
      expect(answer.status()).toBe(403);
    }
    expect((await page.request.get(`/api/v1/workdays/${archieWorkday.id}`)).status()).toBe(404);
  });

  test("a manager of another reporting line sees nobody of this one: the person's page says not found and the API answers 404", async ({ page }) => {
    await openBoard(page, OTHER_MANAGER.email, "/team");
    await expect(tableRows(page)).toHaveCount(1);
    await expect(boardRow(page, OTHER_WORKER)).toBeVisible();
    await page.getByRole("switch", { name: "Include indirect reports" }).click();
    await expect(tableRows(page)).toHaveCount(1);

    await page.goto(`/team/employees/${userIds[ARCHIE.email]}`);
    await expect(page.getByRole("heading", { name: "Employee not found", level: 1 })).toBeVisible();
    await expect(page.getByText("This person is not in your team")).toBeVisible();
    await page.getByRole("link", { name: "Back to Team" }).click();
    await expect(page).toHaveURL(/\/team$/);

    const [archieWorkday] = await sql<{ id: string }>("SELECT id FROM workdays WHERE employee_id = $1", [userIds[ARCHIE.email]]);
    await renewSession(page);
    expect((await page.request.get(`/api/v1/team/members/${userIds[ARCHIE.email]}`)).status()).toBe(404);
    expect((await page.request.get(`/api/v1/team/members/${userIds[ARCHIE.email]}/workdays`)).status()).toBe(404);
    expect((await page.request.get(`/api/v1/workdays/${archieWorkday.id}`)).status()).toBe(404);
    const refused = await page.request.put(`/api/v1/workdays/${archieWorkday.id}/status`, { data: { status: "DAY_ENDED", reason: "Not my report" }, headers: { Origin: WEB_ORIGIN } });
    expect(refused.status()).toBe(404);
    // nor is a manager on their own board
    expect((await page.request.get(`/api/v1/team/members/${userIds[OTHER_MANAGER.email]}`)).status()).toBe(404);
  });

  test("a person's page: who they are, their state, the history of a range with its totals, and a workday's intervals", async ({ page }) => {
    await openBoard(page, LEAD.email, "/team");
    await boardRow(page, ARCHIE).click();
    await expect(page).toHaveURL(new RegExp(`/team/employees/${userIds[ARCHIE.email]}$`));
    await expect(page.getByRole("heading", { name: fullNameOf(ARCHIE), level: 1 })).toBeVisible();
    await expect(page.getByText(`Reports to ${fullNameOf(LEAD)}`)).toBeVisible();
    await expect(memberStatus(page)).toHaveText("Not started");
    await expect(page.getByRole("timer", { name: "Productive time" })).toHaveText("00:00:00");

    await page.getByRole("group", { name: "Date range" }).getByRole("button", { name: "Yesterday" }).click();
    await expect(page).toHaveURL(/range=yesterday/);
    await expect(tableRows(page)).toHaveCount(1);
    const totals = page.getByRole("list", { name: "Totals of the range" });
    await expect(totals).toContainText("7h 30m 00s");
    await expect(totals).toContainText("30m 00s");
    await expect(tableRows(page).first()).toContainText("09:00");
    await expect(tableRows(page).first()).toContainText("05:00 PM");

    await tableRows(page).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("group", { name: "Work and break timeline" }).getByRole("img")).toHaveCount(3);
    await expect(figure(dialog, "Workday summary", "Productive")).toHaveText("7h 30m 00s");
    await expect(dialog.getByRole("heading", { name: "Correct this workday" })).toBeVisible();
    await expect(dialog.getByText("Every correction is recorded in the audit log with your name, the times before and after, and your reason.")).toBeVisible();
    await expect(dialog.getByRole("button", { name: /^Edit / })).toHaveCount(3);
    // an ended day cannot be closed again
    await expect(dialog.getByRole("button", { name: "Close this workday" })).toHaveCount(0);
  });

  test("a correction needs a reason, an overlap is refused with its message, and a valid one changes the totals and is audited", async ({ page }) => {
    await login(page, LEAD.email);
    await expectLanded(page, "/team");
    await page.goto(`/team/employees/${userIds[ARCHIE.email]}?range=yesterday`);
    await expect(tableRows(page)).toHaveCount(1);
    await tableRows(page).first().click();
    const dialog = page.getByRole("dialog");

    // the break may not run into the afternoon's work
    await dialog.getByRole("button", { name: /^Edit Break 12:00/ }).click();
    const breakForm = dialog.getByRole("form", { name: "Correct the break interval" });
    await expect(breakForm.getByLabel("Start", { exact: true })).toHaveValue(`${YESTERDAY}T12:00`);
    await breakForm.getByLabel("End", { exact: true }).fill(`${YESTERDAY}T12:45`);
    await breakForm.getByRole("button", { name: "Save correction" }).click();
    await expect(breakForm.getByText("Give a reason of at least 5 characters.")).toBeVisible();
    await breakForm.getByLabel("Reason").fill("Lunch took longer");
    await expect(breakForm.getByText("17 of 500 characters, at least 5")).toBeVisible();
    await expect(breakForm.getByRole("status")).toContainText("After this correction");
    await breakForm.getByRole("button", { name: "Save correction" }).click();
    await expect(breakForm.getByText(OVERLAP_MESSAGE)).toBeVisible();
    await breakForm.getByRole("button", { name: "Cancel" }).click();
    expect(await auditCount("time.session_adjusted", LEAD.email)).toBe(0);

    // the afternoon's work starts 15 minutes later
    await dialog.getByRole("button", { name: /^Edit Work 12:30/ }).click();
    const workForm = dialog.getByRole("form", { name: "Correct the work interval" });
    await workForm.getByRole("button", { name: "Save correction" }).click();
    await expect(workForm.getByText("Nothing changed. Change the start or the end time first.")).toBeVisible();
    await workForm.getByLabel("Start", { exact: true }).fill(`${YESTERDAY}T12:45`);
    await workForm.getByLabel("Reason").fill("Came back late from lunch, confirmed with Archie");
    await expect(workForm.getByRole("status")).toContainText("Productive 7h 15m 00s (now 7h 30m 00s)");
    await workForm.getByRole("button", { name: "Save correction" }).click();
    await expect(toastWith(page, "Time corrected.")).toBeVisible();
    await expect(workForm).toHaveCount(0);
    await expect(figure(dialog, "Workday summary", "Productive")).toHaveText("7h 15m 00s");
    await expect(dialog.getByRole("button", { name: /^Edit Work 12:45/ })).toBeVisible();
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(tableRows(page).first()).toContainText("7h 15m 00s");
    await expect(page.getByRole("list", { name: "Totals of the range" })).toContainText("7h 15m 00s");

    const [audit] = await sql<{ reason: string; subject_id: string }>("SELECT reason, subject_id FROM audit_logs WHERE action = 'time.session_adjusted' AND actor_id = $1", [userIds[LEAD.email]]);
    expect(audit).toEqual({ reason: "Came back late from lunch, confirmed with Archie", subject_id: userIds[ARCHIE.email] });
    const [session] = await sql<{ started_at: Date }>("SELECT started_at FROM work_sessions WHERE employee_id = $1 ORDER BY started_at DESC LIMIT 1", [userIds[ARCHIE.email]]);
    expect(session.started_at.toISOString()).toBe(new Date(businessInstant(YESTERDAY, "12:45")).toISOString());
  });

  test("nobody corrects their own time: no controls on one's own workday, and the API answers 403", async ({ page }) => {
    await login(page, LEAD.email);
    await expectLanded(page, "/team");
    await page.goto("/my-time");
    await pressTimeButton(page, "Start work", "Working");
    await page.goto("/my-history?range=today");
    await tableRows(page).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("group", { name: "Work and break timeline" })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Correct this workday" })).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: /^Edit / })).toHaveCount(0);

    const [workday] = await sql<{ id: string }>("SELECT id FROM workdays WHERE employee_id = $1", [userIds[LEAD.email]]);
    const [session] = await sql<{ id: string }>("SELECT id FROM work_sessions WHERE workday_id = $1", [workday.id]);
    await renewSession(page);
    const refused = await page.request.patch(`/api/v1/workdays/${workday.id}/work-sessions/${session.id}`,
      { data: { startedAt: new Date(Date.now() - 3_600_000).toISOString(), reason: "I started earlier" }, headers: { Origin: WEB_ORIGIN } });
    expect(refused.status()).toBe(403);
    expect((await refused.json()).code).toBe("CANNOT_CORRECT_OWN_TIME");
    const closeRefused = await page.request.put(`/api/v1/workdays/${workday.id}/status`, { data: { status: "DAY_ENDED", reason: "Going home now" }, headers: { Origin: WEB_ORIGIN } });
    expect(closeRefused.status()).toBe(403);
    // the owner corrects the manager's time instead (a manager's time is their manager's or the owner's to correct)
    const owner = await apiSession(OWNER.email);
    expect((await owner.get(`/api/v1/team/members/${userIds[LEAD.email]}`)).status()).toBe(200);
    await owner.dispose();
    await page.keyboard.press("Escape");
    await page.goto("/my-time");
    await button(page, "End workday").click();
    await page.getByRole("dialog", { name: "End your workday?" }).getByRole("button", { name: "End workday" }).click();
    await expect(timeStatus(page)).toHaveText("Day ended");
  });

  test("closing a forgotten workday: flagged Not ended on the board, ended at the chosen time with a reason after a confirmation", async ({ page }) => {
    // Fay started yesterday at 09:00 and never ended: open longer than the stale workday hours
    const employeeId = userIds[FORGETFUL.email];
    const [workday] = await sql<{ id: string }>(
      `INSERT INTO workdays (business_id, employee_id, work_date, time_zone, started_at, status, active_employee_id)
       VALUES ($1, $2, $3, $4, $5, 'WORKING', $2) RETURNING id`, [businessId, employeeId, YESTERDAY, BUSINESS_TIME_ZONE, businessInstant(YESTERDAY, "09:00")]);
    await sql("INSERT INTO work_sessions (business_id, employee_id, workday_id, started_at, open_workday_id) VALUES ($1, $2, $3, $4, $3)",
      [businessId, employeeId, workday.id, businessInstant(YESTERDAY, "09:00")]);

    await openBoard(page, LEAD.email, "/team");
    await expect(boardRow(page, FORGETFUL)).toContainText("Working");
    await expect(boardRow(page, FORGETFUL)).toContainText("Not ended");
    await expect(tile(page, "Not ended", 1)).toBeVisible();

    await boardRow(page, FORGETFUL).click();
    await expect(memberStatus(page)).toContainText("Not ended");
    await page.getByRole("button", { name: "Open this workday" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("This workday was not ended and has been open too long.")).toBeVisible();
    // the running interval only moves its start
    await dialog.getByRole("button", { name: /^Edit Work 09:00/ }).click();
    await expect(dialog.getByRole("form", { name: "Correct the work interval" }).getByLabel("End", { exact: true })).toBeDisabled();
    await dialog.getByRole("form", { name: "Correct the work interval" }).getByRole("button", { name: "Cancel" }).click();

    await dialog.getByRole("button", { name: "Close this workday" }).click();
    const closeForm = dialog.getByRole("form", { name: "Close this workday" });
    await closeForm.getByLabel("End time").fill(`${YESTERDAY}T08:00`);
    await closeForm.getByLabel("Reason").fill("Forgot to end the day; left at 18:00 as confirmed");
    await closeForm.getByRole("button", { name: "Close this workday" }).click();
    await expect(closeForm.getByText("The end time cannot be before the last recorded activity.")).toBeVisible();
    await closeForm.getByLabel("End time").fill(`${YESTERDAY}T18:00`);
    await closeForm.getByRole("button", { name: "Close this workday" }).click();
    const confirmation = page.getByRole("dialog", { name: "Close this workday?" });
    await expect(confirmation).toContainText("recorded in the audit log");
    await confirmation.getByRole("button", { name: "Close workday" }).click();
    await expect(toastWith(page, "Workday ended.")).toBeVisible();
    await expect(dialog.locator(".chip", { hasText: "Day ended" })).toBeVisible();
    await expect(figure(dialog, "Workday summary", "Productive")).toHaveText("9h 00m 00s");

    const [closed] = await sql<{ status: string; ended_at: Date }>("SELECT status, ended_at FROM workdays WHERE id = $1", [workday.id]);
    expect(closed.status).toBe("COMPLETED");
    expect(closed.ended_at.toISOString()).toBe(new Date(businessInstant(YESTERDAY, "18:00")).toISOString());
    expect(await auditCount("time.workday_closed", LEAD.email)).toBe(1);

    // yesterday's day is over: today she has not started
    await page.keyboard.press("Escape");
    await expect(memberStatus(page)).toHaveText("Not started");
    await page.goto("/team");
    await expect(boardRow(page, FORGETFUL)).toContainText("Not started");
    await expect(tile(page, "Not ended", 0)).toBeVisible();
  });

  test("a deactivated employee drops off the board; their page and history stay readable", async ({ page }) => {
    await openBoard(page, LEAD.email, "/team");
    await expect(boardRow(page, LEAVER)).toBeVisible();
    await expect(tile(page, "People", 5)).toBeVisible();

    const owner = await apiSession(OWNER.email);
    expect((await owner.put(`/api/v1/employees/${userIds[LEAVER.email]}/status`, { data: { isActive: false, reason: "e2e: left the company" } })).status()).toBe(200);
    await owner.dispose();
    await comeBackToTab(page);
    await expect(boardRow(page, LEAVER)).toHaveCount(0);
    await expect(tile(page, "People", 4)).toBeVisible();

    await page.goto(`/team/employees/${userIds[LEAVER.email]}`);
    await expect(page.getByRole("heading", { name: fullNameOf(LEAVER), level: 1 })).toBeVisible();
    await expect(page.getByText("Inactive")).toBeVisible();
  });
});
