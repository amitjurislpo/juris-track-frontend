# JurisTrack — frontend

The JurisTrack web app: a React single-page app (Vite + TypeScript + React Router + TanStack Query) for time tracking
(start, break, resume, end day), reporting managers and their reports, reports and the audit log. It has no server of its own; every number on screen comes
from the Spring Boot API in the backend repo (`juris-track-backend`).

> **Status:** Phase 1 and 2 skeleton. Sign-in, the shell, the role-based navigation and one "Coming soon" placeholder per page
> exist; the real pages follow the backend modules (see `references/MIGRATION_PLAN.md` in the backend repo).

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

1. Run the API (backend repo): `docker compose up -d db`, then `./mvnw spring-boot:run` in `backend/` -> http://localhost:8082
2. `npm install`
3. `npm run dev` -> http://localhost:3007

Settings come from the environment only (no env files): `WEB_PORT` (default 3007) and `BACKEND_URL` (default `http://127.0.0.1:8082`).
The dev server and `vite preview` proxy `/api/*` to `BACKEND_URL`, so the browser only talks to its own origin (the API's
`SameSite=Lax` cookies and Origin check expect that). The backend's app URL / frontend origin must be `http://localhost:3007`.

To show the fixed sign-in code on the login page in development, set `VITE_DEV_OTP_CODE` to the backend's fixed code at build time
(leave it unset everywhere else; it is only a hint).

| Environment | Web | API | Database |
|---|---|---|---|
| dev | 3007 | 8082 | 5437 |
| e2e | 3008 | 8083 | `<db>_e2e` |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload on `WEB_PORT` (3007) |
| `npm run build` | Typecheck, then build static files into `dist/` |
| `npm run preview` | Serve `dist/` locally (with the `/api` proxy) |
| `npm run typecheck` / `npm run lint` | `tsc --noEmit` / ESLint |
| `npm test` | Unit tests (roles and navigation, safe redirect, i18n) |
| `npm run test:e2e` | Playwright end-to-end tests (see below) |

## Roles and pages

There are no teams: the unit is the reporting line (each employee has at most one reporting manager, assigned by the owner). Every user of a
business has the same personal section; roles only add pages for looking at other people.

| Role | Pages |
|---|---|
| `EMPLOYEE` | Personal section only: `dashboard`, `my-time`, `my-history`, `profile`. Lands on `/dashboard`. |
| `MANAGER` | Personal section, plus the **Team** group: `team` (live board of my reports), `team/employees/:id` (one report's history), `team/reports` (reports and CSV). Lands on `/team`; the personal section stays one click away. |
| `ADMIN` (shown as "Owner") | Personal section, plus **Administration**: `admin` (overview), `admin/employees` (list, `new`, `:id`, including assigning each employee's manager), `admin/time-tracking` (live board of everyone), `admin/reports`, `admin/audit-log`, `admin/settings`; `setup` on first run. Lands on `/admin`. |
| `SUPER_ADMIN` | Platform pages only (no business): `platform` (businesses), `platform/businesses/:id`, `platform/audit`. Lands on `/platform`. |

All pages are "Coming soon" placeholders for now. The sidebar groups (`src/standalone/nav.ts`) are "My workspace", "Team", "Administration" and "Platform".

## The API contract the app assumes

- `GET /api/me` -> `{ id, firstName, lastName, email, role, businessName }` (`role` is `SUPER_ADMIN`, `ADMIN` (shown as "Owner"), `MANAGER` or `EMPLOYEE`; `businessName` is null for `SUPER_ADMIN`), 401 when signed out.
- `POST /api/auth/otp-requests` `{ email }` mails a 6-digit code; `POST /api/auth/sessions` `{ email, otp, remember }` creates the session
  (cookies); `DELETE /api/auth/sessions/current` signs out; `POST /api/auth/session-refreshes` renews the session cookies.
- Success answers are `{ ok: true, data?, message? }`; errors are RFC 7807 problem details (`detail`).

## Deploying (standalone)

`npm run build` produces static files. Serve them from a web server **on the same origin as the API** and send `/api/*` to the Spring Boot
service; unknown paths must fall back to `index.html`. Example (nginx):

```nginx
server {
  listen 443 ssl;
  server_name track.example.com;
  root /srv/juristrack-frontend/dist;

  location /api/ {
    proxy_pass http://127.0.0.1:8082;
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
  - `user`: `{ id, firstName, lastName, email, role, businessName }`, with `role` one of `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `EMPLOYEE` and `businessName` null for the super admin.
  - `t(text, variables?)`: the translate function (the English text is the key; the host merges the Hindi dictionaries exported by `src/track/messages`).
  - `navigate(to)`: moves to a JurisTrack path, or back in history with a negative number.
  - `toast(message, kind?)`: shows a short message.
  - `onUnauthorized?(info)`: called on a 401; renew the session and return true to repeat the request.
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
inactive codes, route protection, sign-out and the session refresh; the page specs come with the pages (`tests/e2e/helpers.ts` has the
shared helpers).

## Working rules

See [CLAUDE.md](CLAUDE.md) and [INSTRUCTIONS.md](INSTRUCTIONS.md) (naming and REST standards, git rules, checks to run before "done").
