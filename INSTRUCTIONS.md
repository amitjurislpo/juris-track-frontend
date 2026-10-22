# Owner's instructions

This file is for the project owner to write requirements and working rules in. It is loaded automatically at the start of
every Claude Code session (through `CLAUDE.md`), so whatever is written here is followed without being repeated.
Add new lines at the bottom of the right section. Hindi, Hinglish or English are all fine. If two lines disagree, the newer one wins.

## How to work with me (git and PRs)

- Create every pull request against the `dev` branch first, never `main`. New feature branches are cut from `dev`.
- Never merge a pull request yourself. Open it, share the link and stop.
- Commit and push only when asked. Do not push on your own.
- Never put `.idea/` (or other IDE folders) in a commit; they are git-ignored.
- Commit messages end with the Claude co-author line given by the harness.

## Communication

- Reply in Hindi/Hinglish (the owner writes in Hindi). Keep answers short: what changed, what was checked, what is left.
- Say plainly when something was not tested or could not be done. Do not claim a check that was not run.
- Ask before deleting things that cannot be recovered (files outside git, local data). Explain what and why.

## Project structure

- Two repositories: this one is the **web app** (React + Vite SPA) and `juris-track-backend` is the **backend** (Spring Boot API). Frontend code lives only here; backend code only there.
- JurisTrack is sold standalone and also embedded in JurisOne. This repo therefore has two layers: `src/track/` (the embeddable pages, routes, API client, rules; it gets everything environment-specific through `TrackContext` and must never import `src/standalone/`, enforced by ESLint) and `src/standalone/` (sign-in, shell, session, app wiring). Embedding itself is not built yet.
- The browser only talks to its own origin; `/api/*` is proxied to the API (`vite.config.ts`). The API enforces all permissions; hiding things in the UI is cosmetic.
- The e2e tests need the backend repo checked out next to this one (`../juris-track-backend`, or `BACKEND_REPO`) and Docker running.
- JurisTrack is its own product (own database, own sign-in); its users are the JurisOne employees, copied read-only by the backend. Nothing in the JurisOne repos is changed for it. The old Next.js app (`C:\JurisLPO\JurisTrack`) is a reference for behaviour only.

## Code and configuration rules

- The repo must stay clean: no unused files, exports or dependencies (check with `npx knip`), no leftover references to removed things (Next.js, Prisma, Tailwind, `.env` files).
- No env files: the only settings are `WEB_PORT` and `BACKEND_URL` (defaults in `vite.config.ts`) and the optional build-time `VITE_DEV_OTP_CODE`.
- English text is the translation key (`src/lib/i18n`); every new `t("…")` string needs its Hindi in `messages/hi.ts` (a unit test checks it).
- Verify before saying "done": `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `npm run test:e2e` for anything that changes behaviour.

## Naming and REST standards (mandatory for all new code; fix old code when you touch it)

**Names (both repos)**
- Names say what a thing is, in full words: `AttendancePolicy`, not `Pol`; `departmentId`, not `dept`; `month`, not `ym`. No cryptic abbreviations in class, type, function, field, variable, file, route, query-parameter or JSON names.
- Single-letter names only for a loop index (`i`, `j`), an exception or event (`e`), the translate function `t`, and a tiny one-expression lambda. Never for domain values.
- Booleans read as a question (`isActive`, `hasPhoto`, `canEdit`). Functions are verbs (`loadEmployees`, `confirmEmployee`); classes, records and types are nouns.
- Casing: classes, records, enums, React components and TypeScript types are `PascalCase`; methods, variables, fields, JSON fields and query parameters are `camelCase`; constants are `UPPER_SNAKE_CASE`; URL path segments are `kebab-case`; database tables and columns are `snake_case`.
- Java packages are lowercase and follow the layers already used (`controller`, `service`, `repository`, `entity`, `engine`, `security`). A file holds the one class it is named after.

**REST API (backend, and the frontend calls that use it)**
- A URL names a resource, never an action: plural nouns for collections (`/api/leave/requests`), the id in the path (`/api/people/{id}`), sub-resources for what belongs to it (`/api/people/{id}/photo`). No verbs in paths. An action that has no resource of its own is modelled as creating one (`POST /api/auth/otp-requests`, `POST /api/policies/{id}/acknowledgements`), or as setting a state (`PUT /api/people/{id}/status`).
- Methods: `GET` reads and never changes anything; `POST` creates (answer `201` with the new id); `PUT` sets or replaces and is idempotent; `PATCH` changes part of a resource; `DELETE` removes. Do not tunnel changes through `GET`.
- Collections take their filters, sorting and paging as camelCase query parameters (`status`, `departmentId`, `month`, `search`, `sortBy`, `page`), always descriptive. The current user's own collection is `/mine` everywhere.
- Status codes mean what they say: `200`, `201`, `204`, `400` bad input, `401` not signed in, `402` subscription, `403` not allowed, `404` not found, `409` conflict, `422` a business rule refused it, `429` too many requests. Errors use the one error shape the API already has (RFC 7807 problem details); never invent another.
- A new endpoint is added together with its integration test, its entry in `references/REQUIREMENTS.md` where it changes a rule, and (for a write) an audit entry.
- Screens that need several things at once (`/api/home`, `/api/overview`, `/api/team`, `/api/shell`) are view models, not resources. Keep them few; do not add more where a resource will do.
- Do not rename or remove an endpoint, parameter or JSON field without changing every caller (the other repo, the tests) in the same change.

**Frontend specifics**
- A page reads `const { user, t, searchParams, params } = usePage()`; use `user`, not `u`, and `data`, not `d`, for what `useData` returns.
- Files and folders are named after what they hold (`TimerPanel.tsx`, `AuditTable.tsx`); one exported component per file. Hooks start with `use`.
- API calls live in the page folder's `actions.ts`, one function per endpoint, named after what it does (`confirmEmployee`, `uploadProfilePhoto`); the path and method there must match the backend exactly.

## Requirements (add yours here)

- 

## Decisions already taken

- Sign-in is by emailed code only (fixed code `000000` only in dev). No passwords.
- The UI uses the JurisOne design CSS (verbatim prototype CSS plus app additions), not Tailwind. English and Hindi (English text is the translation key).
- Ports (dev): web 3007, API 8082, DB 5437; e2e web 3008, API 8083.
- The identity provider (IAM JCG / Sita) is not to be worked on until the owner says so.
