import { expect, test, type Page } from "@playwright/test";
import { apiSession, expectLanded, login, renewSession, signInElsewhere, sql, SUPER_ADMIN_EMAIL, tableRows, to12Hour, toastWith, WEB_ORIGIN } from "./helpers";

// Module 2 (personal time tracking): My time (the timer), the dashboard, My history and the display time zone switcher.
// The tests run in order against one new business per run (unique names and emails), set up through the real API.

const RUN = Date.now().toString();
const BUSINESS_NAME = `Clockwork ${RUN}`;
const BUSINESS_TIME_ZONE = "Asia/Kolkata";
const DISPLAY_TIME_ZONE = "America/New_York";
const person = (firstName: string, lastName: string, emailName: string) => ({ firstName, lastName, email: `${emailName}.${RUN}@clockwork.test` });
const OWNER = person("Tara", "Owner", "owner");
const MANAGER = person("Milo", "Manager", "manager");
const WORKER = person("Wen", "Worker", "worker");
const CLICKER = person("Cleo", "Clicker", "clicker");
const NIGHT_WORKER = person("Nia", "Nightshift", "night");
const LEAVER = person("Leo", "Leaver", "leaver");

const PAUSED = "Your company's access is paused";
const END_ON_BREAK_HINT = "Return from your break before ending your day.";
const START_AGAIN_HINT = "Starting again reopens today's workday. The time since you ended counts as neither productive nor break time.";

let businessId = "";

const timer = (page: Page) => page.getByRole("timer", { name: "Productive time" });
const timeStatus = (page: Page) => page.getByTestId("time-status");
const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const userIdOf = async (email: string) => (await sql<{ id: string }>("SELECT id FROM users WHERE email = $1", [email]))[0].id;

/** The productive timer in seconds ("01:02:03" -> 3723). */
async function readTimer(page: Page): Promise<number> {
  const text = (await timer(page).textContent()) ?? "";
  const [hours, minutes, seconds] = text.trim().split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

/** The value next to `label` in a figures list (design `.summary`). */
const figure = (page: Page, listLabel: string, label: string) =>
  page.locator(`dl[aria-label="${listLabel}"]`).locator("div").filter({ has: page.locator("dt", { hasText: new RegExp(`^${label}$`) }) }).locator("dd");

/** A calendar date in the business time zone, `daysAgo` days before today. */
function businessDate(daysAgo: number): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

/** "09:00" of a business-zone wall clock time on `date`, shown in another zone. */
function clockIn(timeZone: string, date: string, wallClock: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(`${date}T${wallClock}:00+05:30`));
}

/** The date as the app writes it ("Wed, 21 Oct 2026"). */
const dateText = (date: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(`${date}T00:00:00Z`));

/** A finished workday written straight into the database: intervals as [type, from, to] wall-clock times in the business time zone. */
async function insertEndedWorkday(email: string, date: string, intervals: ["WORK" | "BREAK", string, string][]) {
  const employeeId = await userIdOf(email);
  const at = (wallClock: string) => `${date}T${wallClock}:00+05:30`;
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
}

/** The employee's workdays and intervals in the database. */
async function countsOf(email: string) {
  const employeeId = await userIdOf(email);
  const [counts] = await sql<{ workdays: string; work_sessions: string; break_sessions: string }>(
    `SELECT (SELECT count(*) FROM workdays WHERE employee_id = $1) AS workdays,
            (SELECT count(*) FROM work_sessions WHERE employee_id = $1) AS work_sessions,
            (SELECT count(*) FROM break_sessions WHERE employee_id = $1) AS break_sessions`, [employeeId]);
  return { workdays: Number(counts.workdays), workSessions: Number(counts.work_sessions), breakSessions: Number(counts.break_sessions) };
}

/** Ends the day through the confirmation dialog. */
async function endWorkday(page: Page) {
  await button(page, "End workday").click();
  const dialog = page.getByRole("dialog", { name: "End your workday?" });
  await expect(dialog).toContainText("Productive so far:");
  await dialog.getByRole("button", { name: "End workday" }).click();
  await expect(toastWith(page, "Workday ended. Your summary is ready.")).toBeVisible();
  await expect(dialog).toHaveCount(0);
  await expect(timeStatus(page)).toHaveText("Day ended");
}

/** Makes the app read its data again, as when the person comes back to the tab (TanStack Query refetches on visibility). */
const comeBackToTab = (page: Page) => page.evaluate(() => document.dispatchEvent(new Event("visibilitychange", { bubbles: true })));

test.describe.serial("personal time tracking", () => {
  test.beforeAll(async () => {
    const superAdmin = await apiSession(SUPER_ADMIN_EMAIL);
    const created = await superAdmin.post("/api/v1/businesses", { data: { name: BUSINESS_NAME, timeZone: BUSINESS_TIME_ZONE, owner: OWNER } });
    expect(created.status()).toBe(201);
    businessId = (await created.json()).data.id;
    await superAdmin.dispose();

    const owner = await apiSession(OWNER.email);
    const addEmployee = async (employee: typeof WORKER, role: "EMPLOYEE" | "MANAGER", managerId?: string) => {
      const answer = await owner.post("/api/v1/employees", { data: { ...employee, role, ...(managerId ? { managerId } : {}) } });
      expect(answer.status()).toBe(201);
      return (await answer.json()).data.id as string;
    };
    const managerId = await addEmployee(MANAGER, "MANAGER");
    for (const employee of [WORKER, CLICKER, NIGHT_WORKER, LEAVER]) await addEmployee(employee, "EMPLOYEE", managerId);
    await owner.dispose();
  });

  test("an employee starts work, takes a break (productive time stops), resumes and ends the day; a reload and a second browser show the same state; the summary matches the history", async ({ page, browser }) => {
    await login(page, WORKER.email);
    await expectLanded(page, "/dashboard");
    await page.goto("/my-time");
    await expect(timeStatus(page)).toHaveText("Not started");
    await expect(timer(page)).toHaveText("00:00:00");
    await expect(button(page, "End workday")).toHaveCount(0);

    await button(page, "Start work").click();
    await expect(toastWith(page, "Workday started. Have a productive day.")).toBeVisible();
    await expect(timeStatus(page)).toHaveText("Working");
    await expect.poll(() => readTimer(page), { timeout: 10_000 }).toBeGreaterThanOrEqual(2);
    await expect(page.getByRole("group", { name: "Work and break timeline" }).getByRole("img")).toHaveCount(1);

    await button(page, "Take a break").click();
    await expect(toastWith(page, "Break started. Your productive timer is paused.")).toBeVisible();
    await expect(timeStatus(page)).toHaveText("On break");
    await expect(button(page, "End workday")).toBeDisabled();
    await expect(page.getByText(END_ON_BREAK_HINT)).toBeVisible();
    // productive time stands still during the break, the break grows
    const pausedAt = await readTimer(page);
    const breakBefore = await figure(page, "Today's totals", "Break").textContent();
    await page.waitForTimeout(3_000);
    expect(await readTimer(page)).toBe(pausedAt);
    await expect(figure(page, "Today's totals", "Break")).not.toHaveText(breakBefore ?? "");
    await expect(figure(page, "Today's totals", "Breaks")).toHaveText("1");
    await expect(figure(page, "Today's totals", "Last break")).toHaveText(/^\d\d:\d\d [AP]M · running$/); // when the break started, while it runs

    // a reload keeps the same timer (it comes from the server's timestamps, not from a counter in the page)
    await page.reload();
    await expect(timeStatus(page)).toHaveText("On break");
    expect(await readTimer(page)).toBe(pausedAt);

    // the same person in another browser sees the same state
    const otherPage = await signInElsewhere(browser, WORKER.email, "/dashboard");
    await expect(timeStatus(otherPage)).toHaveText("On break");
    expect(await readTimer(otherPage)).toBe(pausedAt);
    await expect(otherPage.getByLabel("Today", { exact: true })).toContainText(/Last break \d\d:\d\d [AP]M · running/); // the Today card of the dashboard
    await otherPage.goto("/my-time");
    await expect(button(otherPage, "Back to work")).toBeEnabled();
    await otherPage.context().close();

    await button(page, "Back to work").click();
    await expect(toastWith(page, "Welcome back. Your productive timer is running.")).toBeVisible();
    await expect(timeStatus(page)).toHaveText("Working");
    await expect.poll(() => readTimer(page), { timeout: 10_000 }).toBeGreaterThan(pausedAt);
    await expect(page.getByRole("group", { name: "Work and break timeline" }).getByRole("img")).toHaveCount(3);

    await expect(figure(page, "Today's totals", "Last break")).toHaveText(/^\d\d:\d\d [AP]M$/); // the break is over: its start time stays
    await endWorkday(page);
    await expect(button(page, "Start again")).toBeVisible();
    await expect(page.getByText(START_AGAIN_HINT)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Today's summary" })).toBeVisible();
    const productive = (await figure(page, "Today's totals", "Productive").textContent())!;
    const breakTime = (await figure(page, "Today's totals", "Break").textContent())!;
    const span = (await figure(page, "Today's totals", "Span").textContent())!;
    // the ended day does not tick any more
    const endedAt = await readTimer(page);
    await page.waitForTimeout(1_500);
    expect(await readTimer(page)).toBe(endedAt);

    await page.goto("/my-history?range=today");
    await expect(tableRows(page)).toHaveCount(1);
    const row = tableRows(page).first();
    for (const value of [productive, breakTime, span, "Day ended", dateText(businessDate(0))]) await expect(row).toContainText(value);
    // the columns say when work started and ended and when the last break started
    for (const heading of ["Work started", "Work ended", "Last break"]) await expect(page.locator("table.t thead")).toContainText(heading);
    await expect(row.locator("td").nth(9)).toHaveText(/^\d\d:\d\d [AP]M$/);
    expect(await countsOf(WORKER.email)).toEqual({ workdays: 1, workSessions: 2, breakSessions: 1 });
  });

  test("starting again after the day ended reopens the same workday; the gap counts as neither productive nor break time", async ({ page }) => {
    await login(page, WORKER.email);
    await expectLanded(page, "/dashboard");
    await page.goto("/my-time");
    await expect(timeStatus(page)).toHaveText("Day ended");
    const productiveBefore = await readTimer(page);
    await page.waitForTimeout(5_000);
    await button(page, "Start again").click();
    await expect(toastWith(page, "Workday started. Have a productive day.")).toBeVisible();
    await expect(timeStatus(page)).toHaveText("Working");
    // the timer goes on from where it stopped: the five seconds of the gap are not added
    const productiveAfter = await readTimer(page);
    expect(productiveAfter).toBeGreaterThanOrEqual(productiveBefore);
    expect(productiveAfter).toBeLessThan(productiveBefore + 4);
    expect(await countsOf(WORKER.email)).toEqual({ workdays: 1, workSessions: 3, breakSessions: 1 });
    const [audit] = await sql<{ count: string }>("SELECT count(*) FROM audit_logs WHERE action = 'time.workday_reopened' AND actor_id = $1", [await userIdOf(WORKER.email)]);
    expect(Number(audit.count)).toBe(1);
    await endWorkday(page);
  });

  test("a double click on Start, and parallel requests, create one workday and one work session", async ({ page }) => {
    await login(page, CLICKER.email);
    await expectLanded(page, "/dashboard");
    await page.goto("/my-time");
    await button(page, "Start work").dblclick();
    await expect(timeStatus(page)).toHaveText("Working");
    await expect(toastWith(page, "Workday started. Have a productive day.")).toHaveCount(1);
    expect(await countsOf(CLICKER.email)).toEqual({ workdays: 1, workSessions: 1, breakSessions: 0 });

    // three tabs press Start at the same moment after the day ended: exactly one reopens it
    await endWorkday(page);
    await renewSession(page);
    const answers = await Promise.all([1, 2, 3].map(() => page.request.post("/api/v1/me/time-events", { data: { type: "START" }, headers: { Origin: WEB_ORIGIN } })));
    expect(answers.map((answer) => answer.status()).sort()).toEqual([200, 200, 201]);
    const repeats = await Promise.all(answers.filter((answer) => answer.status() === 200).map((answer) => answer.json()));
    expect(repeats.every((repeat) => repeat.data.alreadyApplied === true && repeat.message === undefined)).toBe(true);
    expect(await countsOf(CLICKER.email)).toEqual({ workdays: 1, workSessions: 2, breakSessions: 0 });

    // the page catches up when the person comes back to it
    await comeBackToTab(page);
    await expect(timeStatus(page)).toHaveText("Working");
  });

  test("an inconsistent time record shows an error with a retry instead of a broken timer", async ({ page }) => {
    // Cleo is working; the record is made inconsistent by hand: ON_BREAK without an open break
    const employeeId = await userIdOf(CLICKER.email);
    await sql("UPDATE workdays SET status = 'ON_BREAK' WHERE employee_id = $1 AND ended_at IS NULL", [employeeId]);
    await login(page, CLICKER.email);
    await expectLanded(page, "/dashboard");
    await page.goto("/my-time");
    await expect(timeStatus(page)).toHaveText("On break");
    await button(page, "Back to work").click();
    const alert = page.getByRole("alert").filter({ hasText: "Your time record needs attention" });
    await expect(alert).toContainText("Your time record is in an unexpected state. Please contact your business owner to review it.");
    await expect(button(page, "Back to work")).toBeDisabled();

    // an administrator corrects it; "Check again" reads the state again
    await sql("UPDATE workdays SET status = 'WORKING' WHERE employee_id = $1 AND ended_at IS NULL", [employeeId]);
    await alert.getByRole("button", { name: "Check again" }).click();
    await expect(alert).toHaveCount(0);
    await expect(timeStatus(page)).toHaveText("Working");
    await endWorkday(page);
  });

  test("a manager and the owner track their own time too (dashboard quick action and My time)", async ({ page }) => {
    await login(page, MANAGER.email);
    await expectLanded(page, "/team");
    await page.getByRole("complementary", { name: "Main menu" }).getByRole("link", { name: "Dashboard" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(MANAGER.firstName);
    await expect(timeStatus(page)).toHaveText("Not started");
    await button(page, "Start work").click();
    await expect(toastWith(page, "Workday started. Have a productive day.")).toBeVisible();
    await expect(timeStatus(page)).toHaveText("Working");
    await button(page, "Take a break").click();
    await expect(timeStatus(page)).toHaveText("On break");
    await expect(button(page, "End workday")).toBeDisabled();
    await page.getByRole("link", { name: "Open My time" }).click();
    await expect(page).toHaveURL(/\/my-time$/);
    await expect(timeStatus(page)).toHaveText("On break");
    await button(page, "Back to work").click();
    await expect(timeStatus(page)).toHaveText("Working");
    await endWorkday(page);
    await renewSession(page);
    expect((await (await page.request.get("/api/v1/me/time")).json()).data.status).toBe("DAY_ENDED");

    await page.context().clearCookies();
    await login(page, OWNER.email);
    await expectLanded(page, "/admin");
    await page.getByRole("complementary", { name: "Main menu" }).getByRole("link", { name: "My Time" }).click();
    await expect(page).toHaveURL(/\/my-time$/);
    await button(page, "Start work").click();
    await expect(timeStatus(page)).toHaveText("Working");
    await endWorkday(page);
    expect(await countsOf(OWNER.email)).toEqual({ workdays: 1, workSessions: 1, breakSessions: 0 });
  });

  test("the super admin cannot open the time pages (sent to /platform) and the API refuses them", async ({ page }) => {
    await login(page, SUPER_ADMIN_EMAIL);
    await expectLanded(page, "/platform");
    await expect(page.getByLabel("Show times in")).toHaveCount(0);
    for (const path of ["/dashboard", "/my-time", "/my-history"]) {
      await page.goto(path);
      await expectLanded(page, "/platform");
    }
    await renewSession(page);
    for (const answer of [
      await page.request.get("/api/v1/me/time"),
      await page.request.get("/api/v1/workdays/mine"),
      await page.request.post("/api/v1/me/time-events", { data: { type: "START" }, headers: { Origin: WEB_ORIGIN } }),
    ]) {
      expect(answer.status()).toBe(403);
      expect((await answer.json()).code).toBe("FORBIDDEN");
    }
  });

  test("history: range presets and a custom range in the URL, totals, sorting, pages and the workday's intervals", async ({ page }) => {
    const yesterday = businessDate(1);
    const threeDaysAgo = businessDate(3);
    const fortyDaysAgo = businessDate(40);
    await insertEndedWorkday(WORKER.email, yesterday, [["WORK", "09:00", "13:00"], ["BREAK", "13:00", "13:30"], ["WORK", "13:30", "18:00"]]);
    await insertEndedWorkday(WORKER.email, threeDaysAgo, [["WORK", "10:00", "12:00"]]);
    await insertEndedWorkday(WORKER.email, fortyDaysAgo, [["WORK", "08:00", "12:00"], ["BREAK", "12:00", "13:00"], ["WORK", "13:00", "17:00"]]);

    await login(page, WORKER.email);
    await expectLanded(page, "/dashboard");
    // the dashboard lists the last workdays, newest first
    await expect(tableRows(page)).toHaveCount(4);
    await expect(tableRows(page).first()).toContainText(dateText(businessDate(0)));

    await page.goto("/my-history");
    await expect(page.getByRole("group", { name: "Date range" }).getByRole("button", { name: "This month" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("table.t")).not.toContainText(dateText(fortyDaysAgo));

    await page.getByRole("group", { name: "Date range" }).getByRole("button", { name: "Yesterday" }).click();
    await expect(page).toHaveURL(/range=yesterday/);
    await expect(tableRows(page)).toHaveCount(1);
    const yesterdayRow = tableRows(page).first();
    for (const value of [dateText(yesterday), "09:00 AM", "06:00 PM", "8h 30m 00s", "30m 00s", "9h 00m 00s", "Day ended"]) await expect(yesterdayRow).toContainText(value);
    const totals = page.getByRole("list", { name: "Totals of the range" });
    await expect(totals).toContainText("8h 30m 00s");
    await expect(totals.getByRole("listitem").filter({ hasText: "Workdays" })).toContainText("1");
    // one day: no chart
    await expect(page.getByRole("heading", { name: "Productive and break time per day" })).toHaveCount(0);

    // a custom range from the form, kept in the URL under the API's names
    await page.getByRole("group", { name: "Date range" }).getByRole("button", { name: "Custom range" }).click();
    await page.getByLabel("From date").fill(businessDate(45));
    await page.getByLabel("To date").fill(businessDate(0));
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(new RegExp(`range=custom&from=${businessDate(45)}&to=${businessDate(0)}`));
    await expect(tableRows(page)).toHaveCount(4);
    await expect(totals.getByRole("listitem").filter({ hasText: "Workdays" })).toContainText("4");
    await expect(page.getByRole("heading", { name: "Productive and break time per day" })).toBeVisible();
    await expect(page.getByRole("group", { name: /^Productive and break time per day,/ }).getByRole("img")).toHaveCount(46);
    // newest first by default
    await expect(tableRows(page).first()).toContainText(dateText(businessDate(0)));
    await expect(tableRows(page).last()).toContainText(dateText(fortyDaysAgo));

    // sorting by productive time: ascending, then descending
    await page.getByRole("columnheader", { name: /Productive/ }).getByRole("button").click();
    await expect(page).toHaveURL(/sort=productiveSeconds&sortDirection=asc/);
    await expect(tableRows(page).last()).toContainText("8h 30m 00s");
    await expect(tableRows(page).nth(2)).toContainText("8h 00m 00s");
    await page.getByRole("columnheader", { name: /Productive/ }).getByRole("button").click();
    await expect(page).toHaveURL(/sortDirection=desc/);
    await expect(tableRows(page).first()).toContainText("8h 30m 00s");

    // pages of two rows
    await page.goto(`/my-history?range=custom&from=${businessDate(45)}&to=${businessDate(0)}&pageSize=2`);
    await expect(tableRows(page)).toHaveCount(2);
    await expect(page.getByRole("navigation", { name: "Pages" })).toContainText("1–2 of 4");
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(tableRows(page)).toHaveCount(2);
    await expect(tableRows(page).last()).toContainText(dateText(fortyDaysAgo));

    // a row opens the workday with its intervals
    await page.goto("/my-history?range=yesterday");
    await tableRows(page).first().click();
    const dialog = page.getByRole("dialog", { name: dateText(yesterday) });
    const intervals = dialog.getByRole("list", { name: "Intervals" }).getByRole("listitem");
    await expect(intervals).toHaveCount(3);
    await expect(intervals.nth(0)).toContainText("09:00 AM – 01:00 PM");
    await expect(intervals.nth(0)).toContainText("Work");
    await expect(intervals.nth(0)).toContainText("4h 00m 00s");
    await expect(intervals.nth(1)).toContainText("01:00 PM – 01:30 PM");
    await expect(intervals.nth(1)).toContainText("Break");
    await expect(intervals.nth(1)).toContainText("30m 00s");
    await expect(intervals.nth(2)).toContainText("01:30 PM – 06:00 PM");
    await expect(dialog.getByLabel("Workday summary")).toContainText("8h 30m 00s");
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toHaveCount(0);
  });

  test("the time zone switcher changes the clock times shown, not the dates or durations, and is remembered by the browser", async ({ page }) => {
    const yesterday = businessDate(1);
    await login(page, WORKER.email);
    await expectLanded(page, "/dashboard");
    await page.goto("/my-history?range=yesterday");
    const switcher = page.getByLabel("Show times in");
    await expect(switcher.locator("option")).toHaveCount(2);
    await expect(switcher).toHaveValue(BUSINESS_TIME_ZONE);
    const row = tableRows(page).first();
    await expect(row).toContainText("09:00 AM");

    await switcher.selectOption(DISPLAY_TIME_ZONE);
    await expect(row).toContainText(to12Hour(clockIn(DISPLAY_TIME_ZONE, yesterday, "09:00")));
    await expect(row).toContainText(to12Hour(clockIn(DISPLAY_TIME_ZONE, yesterday, "18:00")));
    for (const unchanged of [dateText(yesterday), "8h 30m 00s", "30m 00s", "9h 00m 00s"]) await expect(row).toContainText(unchanged);
    await row.click();
    const intervals = page.getByRole("dialog").getByRole("list", { name: "Intervals" }).getByRole("listitem");
    // in New York this interval runs past midnight, so its end carries its date ("23 Oct, 03:30 AM")
    await expect(intervals.nth(0)).toContainText(new RegExp(`${to12Hour(clockIn(DISPLAY_TIME_ZONE, yesterday, "09:00"))} – (\\d+ \\w+, )?${to12Hour(clockIn(DISPLAY_TIME_ZONE, yesterday, "13:00"))}`));
    await expect(intervals.nth(0)).toContainText("4h 00m 00s");
    await page.keyboard.press("Escape");

    // remembered by this browser, and used by the timer page too
    await page.reload();
    await expect(page.getByLabel("Show times in")).toHaveValue(DISPLAY_TIME_ZONE);
    await expect(tableRows(page).first()).toContainText(to12Hour(clockIn(DISPLAY_TIME_ZONE, yesterday, "09:00")));
    await page.goto("/my-time");
    const [firstWork] = await sql<{ started_at: Date }>(
      "SELECT ws.started_at FROM work_sessions ws JOIN workdays w ON w.id = ws.workday_id WHERE w.employee_id = $1 AND w.work_date = $2 ORDER BY ws.started_at LIMIT 1",
      [await userIdOf(WORKER.email), businessDate(0)]);
    const shownStart = new Intl.DateTimeFormat("en-GB", { timeZone: DISPLAY_TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(firstWork.started_at);
    await expect(page.getByRole("list", { name: "Intervals" }).getByRole("listitem").first()).toContainText(shownStart);

    await page.getByLabel("Show times in").selectOption(BUSINESS_TIME_ZONE);
    await expect(page.getByLabel("Show times in")).toHaveValue(BUSINESS_TIME_ZONE);
  });

  test("a night shift: a day left open is flagged Not ended, and ending it after midnight shows that day's summary", async ({ page }) => {
    // an open workday that started yesterday at 08:00 (business time): more than the 14 stale hours by now, and past midnight
    const employeeId = await userIdOf(NIGHT_WORKER.email);
    const yesterday = businessDate(1);
    const [workday] = await sql<{ id: string }>(
      `INSERT INTO workdays (business_id, employee_id, work_date, time_zone, started_at, status, active_employee_id)
       VALUES ($1, $2, $3, $4, $5, 'WORKING', $2) RETURNING id`, [businessId, employeeId, yesterday, BUSINESS_TIME_ZONE, `${yesterday}T08:00:00+05:30`]);
    await sql("INSERT INTO work_sessions (business_id, employee_id, workday_id, started_at, open_workday_id) VALUES ($1, $2, $3, $4, $3)",
      [businessId, employeeId, workday.id, `${yesterday}T08:00:00+05:30`]);

    await login(page, NIGHT_WORKER.email);
    await expectLanded(page, "/dashboard");
    await expect(timeStatus(page)).toContainText("Not ended");
    await page.goto("/my-time");
    await expect(timeStatus(page)).toContainText("Working");
    await expect(timeStatus(page)).toContainText("Not ended");
    await expect(page.getByText(/^Not ended: your workday has been open for/)).toBeVisible();
    await expect(page.getByText(`Workday of ${dateText(yesterday)}`)).toBeVisible();

    await button(page, "End workday").click();
    await page.getByRole("dialog", { name: "End your workday?" }).getByRole("button", { name: "End workday" }).click();
    await expect(toastWith(page, "Workday ended. Your summary is ready.")).toBeVisible();
    // today has no workday after the night shift: the state is "Not started" again
    await expect(timeStatus(page)).toHaveText("Not started");
    await expect(button(page, "Start work")).toBeEnabled();
    const notice = page.getByRole("region", { name: "The workday you ended" });
    await expect(notice).toContainText(`Your workday of ${dateText(yesterday)} ended after midnight. Here is its summary.`);
    await expect(notice.getByLabel(`Summary of ${dateText(yesterday)}`)).toContainText("08:00");
    const [ended] = await sql<{ status: string }>("SELECT status FROM workdays WHERE id = $1", [workday.id]);
    expect(ended.status).toBe("COMPLETED");
  });

  test("deactivating a working employee closes their workday and ends their session", async ({ page, browser }) => {
    const employeePage = await signInElsewhere(browser, LEAVER.email, "/dashboard");
    await employeePage.goto("/my-time");
    await button(employeePage, "Start work").click();
    await expect(timeStatus(employeePage)).toHaveText("Working");

    await login(page, OWNER.email);
    await expectLanded(page, "/admin");
    await page.goto(`/admin/employees/${await userIdOf(LEAVER.email)}`);
    await page.getByRole("button", { name: "Deactivate" }).click();
    await page.getByRole("dialog", { name: "Deactivate employee" }).getByRole("button", { name: "Deactivate" }).click();
    await expect(toastWith(page, "Employee deactivated.")).toBeVisible();
    const [workday] = await sql<{ status: string; ended_at: Date | null }>("SELECT status, ended_at FROM workdays WHERE employee_id = $1", [await userIdOf(LEAVER.email)]);
    expect(workday.status).toBe("COMPLETED");
    expect(workday.ended_at).not.toBeNull();
    expect((await countsOf(LEAVER.email)).workSessions).toBe(1);
    const [openSessions] = await sql<{ count: string }>("SELECT count(*) FROM work_sessions WHERE employee_id = $1 AND ended_at IS NULL", [await userIdOf(LEAVER.email)]);
    expect(Number(openSessions.count)).toBe(0);

    // the timer's next reading finds the session ended: the employee is sent to sign-in
    await comeBackToTab(employeePage);
    await expect(employeePage).toHaveURL(/\/login\?next=%2Fmy-time$/, { timeout: 15_000 });
    await employeePage.context().close();
  });

  test("a suspended business shows the paused screen on the timer; reactivating brings the timer back", async ({ page }) => {
    await login(page, WORKER.email);
    await expectLanded(page, "/dashboard");
    await page.goto("/my-time");
    await button(page, "Start again").click();
    await expect(timeStatus(page)).toHaveText("Working");

    const superAdmin = await apiSession(SUPER_ADMIN_EMAIL);
    await renewSession(page);
    expect((await superAdmin.put(`/api/v1/businesses/${businessId}/status`, { data: { isSuspended: true, reason: "e2e: paused timer" } })).status()).toBe(200);
    const refused = await page.request.get("/api/v1/me/time");
    expect(refused.status()).toBe(403);
    expect((await refused.json()).code).toBe("BUSINESS_SUSPENDED");
    // the timer's next reading gets the same answer: the app shows the paused screen instead of the timer
    await comeBackToTab(page);
    await expect(page.getByText(PAUSED)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("timer")).toHaveCount(0);

    expect((await superAdmin.put(`/api/v1/businesses/${businessId}/status`, { data: { isSuspended: false } })).status()).toBe(200);
    await superAdmin.dispose();
    await page.getByRole("button", { name: "Try again" }).click();
    // suspending closed the open workday (reactivating does not reopen it): the timer is back, the day is ended, and the person can start again
    await expect(button(page, "Start again")).toBeVisible();
    await expect(timeStatus(page)).not.toHaveText("Working");
    const [closedDay] = await sql<{ status: string }>("SELECT status FROM workdays WHERE employee_id = $1 ORDER BY started_at DESC LIMIT 1", [await userIdOf(WORKER.email)]);
    expect(closedDay.status).toBe("COMPLETED");
    await button(page, "Start again").click();
    await expect(timeStatus(page)).toHaveText("Working");
    await endWorkday(page);
  });
});
