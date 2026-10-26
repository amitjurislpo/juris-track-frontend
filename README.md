# JurisTrack — frontend

The JurisTrack web app: a React single-page app (Vite + TypeScript + React Router + TanStack Query) for time tracking
(start, break, resume, end day), reporting managers and their reports, reports and the audit log. It has no server of its own; every number on screen comes
from the Spring Boot API in the backend repo (`juris-track-backend`).

> **Status:** Sign-in, the shell, the role-based navigation, module 1 (organization and employees: the super admin's
> businesses, the owner's employees and settings, everybody's profile), module 2 (personal time tracking: dashboard, My time,
> My history, the display time zone switcher), module 4 (the Team tab: the managers' and the owner's live board, one person's
> page with their history, time corrections) and the audit log (the owner's and the super admin's) are built. The other pages are
> "Coming soon" placeholders that follow the backend modules (see `references/MIGRATION_PLAN.md` in the backend repo).

## Stack

- React 19, TypeScript, Vite
- React Router, TanStack Query (cached API reads; every successful write refetches)
- English and Hindi (`src/standalone/i18n`: the English text is the key; a missing translation shows the English text)
- Plain CSS (`src/globals.css`, the JurisOne design prototype CSS verbatim, plus a "JurisTrack additions" block at the end)

## Code layout: two layers

```
src/track/        the embeddable JurisTrack part: pages, trackRoutes, actions.ts files, API client, TrackContext, rules, Hindi texts of the pages
src/standalone/   the standalone app: sign-in (6-box emailed code), session (GET /api/me), shell and sidebar, theme, toasts, language switcher, router wiring
src/main.tsx      starts the standalone app
```

`src/track` never imports `src/standalone` (nor anything else outside `src/track`): ESLint (`no-restricted-imports`) fails the build
if it does, and it also forbids hard-coded `/api` addresses there.

## Run it (development)

1. Run the API (backend repo): `docker compose up -d db`, then `./mvnw spring-boot:run` in `backend/` -> http://localhost:8081
2. `npm install`
3. `npm run dev` -> http://localhost:3006

Settings come from the environment only (no env files): `WEB_PORT` (default 3006) and `BACKEND_URL` (default `http://127.0.0.1:8081`).
The dev server and `vite preview` proxy `/api/*` to `BACKEND_URL`, so the browser only talks to its own origin (the API's
`SameSite=Lax` cookies and Origin check expect that). The backend's app URL / frontend origin must be `http://localhost:3006`.

To show the fixed sign-in code on the login page in development, set `VITE_DEV_OTP_CODE` to the backend's fixed code at build time
(leave it unset everywhere else; it is only a hint).

| Environment | Web | API | Database |
|---|---|---|---|
| dev | 3006 | 8081 | 5437 |
| e2e | 3008 | 8083 | `<db>_e2e` |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload on `WEB_PORT` (3006) |
| `npm run build` | Typecheck, then build static files into `dist/` |
| `npm run preview` | Serve `dist/` locally (with the `/api` proxy) |
| `npm run typecheck` / `npm run lint` | `tsc --noEmit` / ESLint |
| `npm test` | Unit tests (time engine, live totals and clock offset, time buttons per state, history query and chart data, display time zone, roles and navigation, safe redirect, i18n, list query strings, PATCH bodies, problem codes, API client, Team board query and live figures, time corrections) |
| `npm run test:e2e` | Playwright end-to-end tests (see below) |

## Roles and pages

There are no teams: the unit is the reporting line (each employee has at most one reporting manager, assigned by the owner). Every user of a
business has the same personal section; roles only add pages for looking at other people.

| Role | Pages |
|---|---|
| `EMPLOYEE` | Personal section only: `dashboard`, `my-time`, `my-schedule`, `my-history`, `profile`. Lands on `/dashboard`. |
| `MANAGER` | Personal section, plus the **Team** group: `team` (live board of my reports), `team/employees/:id` (one report's history), `team/reports` (reports and CSV), `admin/roster` (the roster of my reports, read-only). Lands on `/team`; the personal section stays one click away. |
| `ADMIN` (shown as "Owner") | Personal section, plus **Administration**: `admin` (overview), `admin/employees` (list, `new`, `:id`, including assigning each employee's manager), `admin/time-tracking` (live board of everyone) and `admin/time-tracking/:id` (one person's time, history and corrections), `admin/reports`, `admin/audit-log`, `admin/shifts`, `admin/roster`, `admin/settings`. Lands on `/admin`. |
| `SUPER_ADMIN` | Platform pages only (no business): `platform` (businesses), `platform/businesses/:id`, `platform/audit`. Creates each business together with its owner. Lands on `/platform`. |

The sidebar groups (`src/standalone/nav.ts`) are "My workspace", "Team", "Administration" and "Platform".

Built pages (modules 1, 2 and 4 and the audit log, in `src/track/pages/`):

| Route | Folder | What it does |
|---|---|---|
| `platform` | `platform` | Businesses: search (name, owner's name or email), status filter (all / active / suspended), sortable columns, pages; "New business" creates a business and its owner. |
| `platform/businesses/:id` | `platform-business` | One business: owner, head counts, settings; edit the settings; suspend / reactivate (with a confirmation and an optional reason). |
| `admin/employees` | `admin-employees` | The owner's people: search, status (active / inactive / all), role and manager filters, sortable columns, pages; a row opens the employee. |
| `admin/employees/new` | `admin-employee-new` | Add an employee (role Employee or Manager, reporting manager chosen from the active managers and owners). |
| `admin/employees/:id` | `admin-employee` | Edit an employee (only the changed fields are sent; removing the manager sends null), deactivate / reactivate. |
| `admin/shifts` | `admin-shifts` | The owner's shifts (time is counted per shift, not per calendar day): name, hours as `19:30 – 04:30 (+1)`, scheduled length, number of employees, Active / Default chips; New / Edit (name, start, end, early-start and late-finish allowances in minutes), Deactivate / Reactivate (the API's `SHIFT_IN_USE` and `DEFAULT_SHIFT_REQUIRED` refusals are shown in the dialog). The employee's page has a "Shift" card (current shift, change with an optional "from" date and a confirmation that recorded days are not rewritten); the Employees list has a Shift column; the new-employee form has a Shift select that starts on the default shift (set with `PUT /employees/{id}/shift` right after the create). |
| `admin/roster` | `admin-roster` | The roster (`GET /schedule-entries`): a month (`month=yyyy-MM`), one row per person (search, manager filter, pages of 20), one column per date, each cell the shift's short name in its colour or "Off". The person column is sticky and the dates scroll inside their own container; on phones an agenda list per person replaces the grid. The owner clicks a cell (shift-click for a range, ctrl-click to add) and sets a shift, a week off, or clears the entry; "Apply pattern" does weekly days off (for example Saturday and Sunday) or a rotation "N days on, M days off" from a start date for the selected people and a date range, says how many dates will change, and saves in batches of 62 dates; `SCHEDULE_DATE_HAS_WORKDAY` and `SCHEDULE_DATE_TOO_FAR` show their messages. A manager sees their reports' roster read-only. |
| `my-schedule` | `my-schedule` | The user's next 14 days (`GET /me/schedule`): each date with its shift and hours, or "Week off". The Dashboard has a "Next shift" card (next working day and next week off). |
| `admin/settings` | `admin-settings` | Business name, time zone, stale workday hours (1 to 48), display time zones (up to 8). |
| `profile` | `profile` | The signed-in user's own account (read-only, from `GET /api/me`). |
| `dashboard` | `dashboard` | Today at a glance (state, live productive and break time, the same time buttons as My time), this week's productive and break time per day, the last five workdays (a row opens the workday). |
| `my-time` | `my-time` | The timer: state chip, big productive timer, Start work / Take a break / Back to work / End workday (confirmation) / Start again, today's totals and timeline, the "Not ended" warning, the summary of a day ended after midnight. |
| `my-history` | `my-history` | History of a date range (`range` = today, yesterday, week, month (default), custom with `from` / `to`), the range's totals and average per day, productive and break time per day (SVG chart), the workdays (sortable, paged); a row opens the workday with its intervals. |
| `team`, `admin/time-tracking` | `team-board` | The live board (one page for both): tiles over everybody of the scope (people, working, on break, not started, day ended, not ended, productive time today in total and on average, running live), the scope (`scope`: a manager's "Include indirect reports" switch = `direct` / `indirect`; the owner's Everybody (`all`, default) / My direct reports / My reporting line), a status filter, search, sortable columns (name, status, productive, last activity), pages. Each row: name and code, manager, state with "Not ended" and the running break's length, live productive time, break, start and last activity in the display time zone. Read again every 15 seconds while the tab is visible, on focus and when the network returns. A row opens the person. |
| `team/employees/:id`, `admin/time-tracking/:id` | `team-member` | One person of the scope: name, code, manager, state with a live timer, today's totals; their history (the My history view on `GET /team/members/{employeeId}/workdays`); a workday (from the history or "Open this workday") shows its intervals and the **corrections**: edit an interval's start and end (a running one only its start) with a mandatory reason, a preview of the new totals and the API's refusals next to the field, or close an open workday (optional end time, reason, confirmation). Out of scope (the API's 404) shows "Employee not found". The owner reaches it from the board and from the employee's page ("Time and history"). |
| `admin/audit-log`, `platform/audit` | `audit-log` | The audit log, read only (one page for both: the owner sees their business, the super admin every business plus a business filter with "No business" = `businessId=none`). Columns: when (display time zone), business (super admin), actor and role, subject, action as a readable label, category and outcome chips, record, source and IP address, request id (copy button); sortable by time, actor, subject, action, category and outcome; pages. Filters in the URL under the API's names: `search`, `from` / `to` (All time, Today, Last 7 days, Last 30 days, Custom; business time zone for the owner, UTC for the super admin), `actorId` / `subjectId` (search pickers over `GET /employees`, owner only), `businessId` (search picker over `GET /businesses`, super admin), `action` (a group = the API's prefix such as `time.`, or one action), `category`, `outcome`, `source`, `entityType`, `entityId`; an active-filters bar with Clear all. A row (click or Enter) opens a side panel (`GET /audit-logs/{auditLogId}`) with every field, the request (method, path, user agent), the reason, the record before and after as a field-by-field diff, "Copy request id" and links that filter by the same request, person or record. "Export CSV" is a plain link to `?format=csv` with the same filters. There are no edit or delete controls: entries are permanent. |

List pages keep their search, filters, sorting and paging in the URL under the API's own query parameter names (`search`, `status`, `role`,
`managerId`, `sort`, `sortDirection`, `page`, `pageSize`), so a list can be bookmarked and the values go to the API unchanged. The shared UI
is in `src/track/components` (list controls in `list/`, `Modal`, `ConfirmDialog`, `FormField`, `StatusChip`, `EmptyState`); the pure helpers
(query strings, PATCH bodies, problem codes to messages and form fields) are in `src/track/lib` and unit tested.

**Time tracking** (`GET /api/me/time`, `POST /api/me/time-events`, `GET /api/workdays/mine`, `GET /api/workdays/{workdayId}`). The pages never
count time themselves: every figure is computed from the last server snapshot (`closedProductiveSeconds + (now - activeWorkStartedAt)`), and
"now" is the server's clock as measured on each answer (`serverTime` against the middle of the round trip, `src/track/lib/time/clock-offset.ts`),
so a wrong browser clock or a sleeping tab never changes a figure. The display ticks once a second and stops while the tab is hidden; the state
is read again every 30 seconds while a timer is visible, when the tab comes back and when the network returns. A time button is disabled while
a request runs (a double click sends one event); a repeat the API reports as `alreadyApplied` just refreshes; the 409 codes get clear messages;
`TIME_RECORD_INCONSISTENT` shows an error with a "Check again" button. The button rules per state are in `src/track/lib/time/timer-actions.ts`.

**Team tab and corrections** (`GET /team/members`, `GET /team/members/{employeeId}`, `GET /team/members/{employeeId}/workdays`,
`GET /workdays/{workdayId}`, `PATCH /workdays/{workdayId}/work-sessions/{sessionId}`, `PATCH /workdays/{workdayId}/break-sessions/{sessionId}`,
`PUT /workdays/{workdayId}/status`; contract in the backend's `references/API-team-and-corrections.md`). The board's timers use the same
helpers as the personal timer (each row's closed seconds plus the running interval, on the server's clock measured on each answer). The
correction forms take date and time in the display time zone and send UTC ISO instants; a time is sent only when it changed (the form shows
minutes, so an untouched field keeps the stored seconds). The rules (reason 5 to 500 characters, end after start, nothing in the future, the
close time not before the last activity), the request bodies, the preview of the totals and where each refusal is shown are in
`src/track/lib/time-correction.ts` (unit tested); the API checks everything again. The corrections are offered only on somebody else's
workday (the person pages never show one's own record; the API refuses one's own time with `CANNOT_CORRECT_OWN_TIME`).

**Display time zone.** The top bar's "Show times in" switcher (every user of a business) offers the business time zone and the business's
display time zones (from `GET /api/me/time`), each with its current time. The choice is per browser, kept in `localStorage`
(`juristrack.displayTimeZone`; a display preference the API never needs, so not a cookie; when storage is blocked the choice lasts until a
reload). It changes the clock times on the time pages (start, end, intervals); workday dates and date ranges stay in the business time zone
as the API returns them, and durations do not change. The switcher (`src/standalone/components/TimeZoneSwitcher.tsx`) is built on the
`useDisplayTimeZone` hook of `src/track`, so an embedding host can offer its own.

**Audit log export.** "Export CSV" is a plain link (`<apiBasePath>/audit-logs?…&format=csv`), so the browser downloads the file with the
session cookie and the backend's file name. The API refuses more than 10,000 rows (422 `EXPORT_TOO_LARGE`); the list on screen has the same
filter, so its `total` is the export's row count: above the cap the link is not followed and the page explains it instead (no probe request,
because a probe would itself run and audit the export). Only if the log grows past the cap between loading the list and the click does the browser
report a failed download. Embedded with a Bearer token instead of cookies, the host has to make such a link work (or the button needs a fetch).
Pure helpers: `src/track/lib/audit` (labels of every catalogue action with a humanized fallback, the before/after diff, filters and request ids).

When the platform suspends a business, its signed-in users get 403 `BUSINESS_SUSPENDED` from the API; the standalone app then shows a
"Your company's access is paused" screen with a sign-out button instead of the pages (`src/standalone/components/BusinessSuspendedScreen.tsx`).

## The API contract the app assumes

- `GET /api/me` -> `{ id, firstName, lastName, email, role, businessName, employeeCode, managerName, businessTimeZone }` (`role` is `SUPER_ADMIN`, `ADMIN` (shown as "Owner"), `MANAGER` or `EMPLOYEE`; `businessName` and `businessTimeZone` are null for `SUPER_ADMIN`), 401 when signed out, 403 `BUSINESS_SUSPENDED` when the business is suspended.
- The full contract (every endpoint, field and error code) is `references/API.md` in the backend repo.
- Time tracking: `GET /api/me/time`, `POST /api/me/time-events` `{ type: START | BREAK | RESUME | END }`, `GET /api/workdays/mine`
  (`range`, `from`, `to`, `sort`, `sortDirection` (default `desc`), `page`, `pageSize`), `GET /api/workdays/{workdayId}`.
- `POST /api/auth/otp-requests` `{ email }` mails a 6-digit code; `POST /api/auth/sessions` `{ email, otp, remember }` creates the session
  (cookies); `DELETE /api/auth/sessions/current` signs out; `POST /api/auth/session-refreshes` renews the session cookies.
- Success answers are `{ ok: true, data?, message? }`; errors are RFC 7807 problem details (`detail` is shown, `code` is mapped to a clear message
  in `src/track/lib/problems.ts`, `errors[{ field, message }]` of a 400 are shown next to their form fields).

## Deploying (standalone)

`npm run build` produces static files. Serve them from a web server **on the same origin as the API** and send `/api/*` to the Spring Boot
service; unknown paths must fall back to `index.html`. Example (nginx):

```nginx
server {
  listen 443 ssl;
  server_name track.example.com;
  root /srv/juristrack-frontend/dist;

  location /api/ {
    proxy_pass http://127.0.0.1:8081;
    proxy_set_header Host $host;                 # the API accepts writes only with Origin = its juristrack.frontend-origin (this site)
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
  }
  location / { try_files $uri /index.html; }
  add_header X-Frame-Options DENY always;
  add_header X-Content-Type-Options nosniff always;
  add_header Referrer-Policy same-origin always;
}
```

## Embedding in JurisOne

JurisTrack is also sold inside JurisOne. The embedding itself (a package, module federation or similar) is **not built yet**; the code is
only kept so that it can be. The boundary:

- **What is embeddable:** everything in `src/track/`: `trackRoutes` (path, title, allowed roles, page component), the pages, their `actions.ts`
  and types, the API client and the Hindi texts (`trackHindiMessages`, `trackHindiApiMessages`). It owns no login and no shell.
- **What the host provides, through `TrackContext`** (`src/track/TrackContext.tsx`, given to `<TrackProvider value=…>`):
  - `apiBasePath`: where the API lives (`/api` standalone; the JurisOne gateway path when embedded). Pages use paths relative to it.
  - `getHeaders()`: extra headers for every call, for example `Authorization: Bearer <token>` (empty for the standalone cookie session).
  - `user`: `{ id, firstName, lastName, email, role, businessName, employeeCode, managerName, businessTimeZone }`, with `role` one of `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `EMPLOYEE` and `businessName` / `businessTimeZone` null for the super admin.
  - `t(text, variables?)`: the translate function (the English text is the key; the host merges the Hindi dictionaries exported by `src/track/messages`).
  - `navigate(to)`: moves to a JurisTrack path, or back in history with a negative number.
  - `toast(message, kind?)`: shows a short message.
  - `onUnauthorized?(info)`: called on a 401; renew the session and return true to repeat the request.
  - `onBusinessSuspended?()`: called on a 403 `BUSINESS_SUSPENDED`; the host shows its own "access is paused" screen.
- **What the host must also supply:** React Router (the pages read route and search params and use `Navigate` and `useLocation`),
  a TanStack `QueryClientProvider`, a `Suspense` boundary and an error boundary around the pages, and a shell that is compatible with the JurisOne
  design CSS (`src/globals.css` is the design prototype CSS; the pages rely on its classes such as `page-h`, `card`, `empty`, `btn`).
  The host mounts `trackRoutes` under its own layout, wrapping each page in `RequireRole` (the API enforces roles anyway).
- **API access:** the host calls the JurisTrack API through its gateway (`apiBasePath` plus the token header); the pages do not know any address.

## End-to-end tests

The tests drive a real browser against a real API and database, so they need the backend repo next to this one (`../juris-track-backend`,
or set `BACKEND_REPO`) and Docker running. `scripts/e2e-env.mjs` builds the API jar with the backend's Maven Wrapper (when missing), starts it on
:8083 with a throw-away database `<db>_e2e` (reset and seeded; files go to the temp folder), builds the SPA into `dist-e2e/` and serves it on
:3008. Development data is never touched. Every sign-in code is `000000`. `E2E_BUILD=1` rebuilds the jar and the SPA. Run it against a fresh copy
of the backend repo (`BACKEND_REPO=<copy>`), not the one that has the dev API running. The e2e API gives access tokens a 15-second
lifetime (instead of 5 minutes) so the tests also cover the silent session refresh.

`tests/e2e/auth.spec.ts` covers sign-in for every role (super admin, owner, manager, employee from the demo seed), wrong / unknown /
inactive codes, route protection, sign-out and the session refresh. `tests/e2e/organization.spec.ts` covers module 1: the super admin
creates, finds, suspends and reactivates a business (its owner is paused and gets no code meanwhile), duplicate emails and codes, the owner's
settings, adding a manager and an employee, editing and manager reassignment (checking the PATCH bodies), the manager-cycle and
manager-with-reports refusals, deactivation ending the open session, the employees list (search, filters, sorting, pages), role protection of
the owner's pages and API, and the profile. `tests/e2e/time-tracking.spec.ts` covers module 2: start, break (productive time stands still),
resume and end (confirmation) with the summary matching the history row, a reload and a second browser showing the same state, Start again
reopening the day, a double click and parallel requests creating one workday, an inconsistent time record, the manager and the owner tracking
their own time, the super admin kept out (pages and API), history ranges, custom range, totals, sorting, pages and the workday dialog, the time
zone switcher, a night shift flagged "Not ended" and ended after midnight, deactivation closing a running workday and ending the session, and a
suspended business pausing the timer. `tests/e2e/team.spec.ts` covers module 4 on a three-level reporting line: the manager's board
(direct reports, the indirect ones after the switch, a manager without reports), live changes from the employee's browser (start, break with the
timer standing still, end), the tiles, filter, search, sorting and pages in the URL, the owner's board of everybody and their own reporting line,
phone widths (390 and 320 px) without sideways scrolling, an employee kept out (pages and API 403), a manager of another line (not-found page,
API 404), a person's page and history, a correction (reason required, overlap refused, totals and audit entry), no corrections of one's own time
(no controls, API 403 `CANNOT_CORRECT_OWN_TIME`), closing a forgotten workday, and a deactivated employee leaving the board. `tests/e2e/helpers.ts` has the shared helpers (including `apiSession` for set-up through the real API). deactivates an employee and finds each entry (actor, subject, action, before/after in the panel), sign-in events (code requested, a wrong code
as DENIED, signed in), the manager and the employee kept out (pages and API 403) and the employee's refusals in the owner's log as
`security.access_denied`, the date / actor / action / category / outcome / search filters, sorting and paging as sent to the API, the request id
(copy, filter by it) and the panel's keyboard and focus handling, the CSV export (byte order mark, CRLF, the filtered rows, itself audited), no edit
or delete anywhere (UI and API), no sideways scrolling at 1280, 390 and 320 px, the super admin's platform log with the business and "no business"
filters, and an export over 10,000 entries explained instead of downloaded (422 `EXPORT_TOO_LARGE` from the API).

## Working rules

See [CLAUDE.md](CLAUDE.md) and [INSTRUCTIONS.md](INSTRUCTIONS.md) (naming and REST standards, git rules, checks to run before "done").
