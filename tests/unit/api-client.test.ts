import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, createApiClient } from "@/track/api";

/** Answers every request with `status` and `body` (as the API would). */
function stubFetch(status: number, body: unknown) {
  const fetchStub = vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));
  vi.stubGlobal("fetch", fetchStub);
  return fetchStub;
}

const clientWith = (overrides: { onBusinessSuspended?: () => void } = {}) =>
  createApiClient({ basePath: "/base", getHeaders: () => ({}), translateMessage: (text) => `hi:${text}`, queryClient: new QueryClient(), ...overrides });

afterEach(() => { vi.unstubAllGlobals(); });

describe("API client: problem details", () => {
  it("keeps the code and the field errors of a 400, translated", async () => {
    stubFetch(400, { status: 400, code: "VALIDATION_FAILED", detail: "First name is required.", errors: [{ field: "firstName", message: "First name is required." }, { bad: 1 }] });
    const result = await clientWith().action("POST", "/employees", {});
    expect(result).toEqual({ ok: false, error: "hi:First name is required.", code: "VALIDATION_FAILED", errors: [{ field: "firstName", message: "hi:First name is required." }] });
  });

  it("keeps the code of a business-rule refusal", async () => {
    stubFetch(422, { status: 422, code: "MANAGER_CYCLE", detail: "loop" });
    const result = await clientWith().action("PATCH", "/employees/1", { managerId: "2" });
    expect(result).toMatchObject({ ok: false, code: "MANAGER_CYCLE", error: "hi:loop" });
  });

  it("sends writes to the base path with the method and JSON body", async () => {
    const fetchStub = stubFetch(200, { ok: true, message: "Employee saved." });
    const result = await clientWith().action("PATCH", "/employees/1", { managerId: null });
    expect(result).toEqual({ ok: true, message: "hi:Employee saved." });
    expect(fetchStub).toHaveBeenCalledWith("/base/employees/1", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ managerId: null }) }));
  });

  it("a failed read throws an ApiError carrying the status and code", async () => {
    stubFetch(404, { status: 404, code: "NOT_FOUND", detail: "Employee not found." });
    const failure = await clientWith().data("/employees/x").catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 404, code: "NOT_FOUND", message: "hi:Employee not found." });
  });

  it("a failed read carries the translated field errors of a 400", async () => {
    stubFetch(400, { status: 400, code: "VALIDATION_FAILED", detail: "Some details are invalid.", errors: [{ field: "scope", message: "The scope is direct, indirect or all." }] });
    const failure = await clientWith().data("/reports/workdays?scope=x").catch((error: unknown) => error);
    expect(failure).toMatchObject({ status: 400, fieldErrors: [{ field: "scope", message: "hi:The scope is direct, indirect or all." }] });
  });

  it("tells the host when the business is suspended (403 BUSINESS_SUSPENDED), and only then", async () => {
    const onBusinessSuspended = vi.fn();
    stubFetch(403, { status: 403, code: "BUSINESS_SUSPENDED", detail: "suspended" });
    await clientWith({ onBusinessSuspended }).data("/employees").catch(() => undefined);
    expect(onBusinessSuspended).toHaveBeenCalledTimes(1);
    stubFetch(403, { status: 403, code: "FORBIDDEN", detail: "no" });
    await clientWith({ onBusinessSuspended }).data("/employees").catch(() => undefined);
    expect(onBusinessSuspended).toHaveBeenCalledTimes(1);
  });
});

describe("API client: file downloads", () => {
  const CSV = "﻿Date,Employee\r\n2026-10-20,Asha Rao\r\n";

  it("asks for the representation with the Accept header and hands back the blob and its Content-Disposition", async () => {
    const fetchStub = vi.fn(async () => new Response(CSV, {
      status: 200,
      headers: { "content-type": "text/csv;charset=UTF-8", "content-disposition": 'attachment; filename="juristrack-2026-10-19-to-2026-10-23.csv"' },
    }));
    vi.stubGlobal("fetch", fetchStub);
    const result = await clientWith().file("/reports/workdays?timeZone=Asia%2FKolkata", "text/csv");
    expect(fetchStub).toHaveBeenCalledWith("/base/reports/workdays?timeZone=Asia%2FKolkata", expect.objectContaining({ method: "GET", headers: { accept: "text/csv" } }));
    if (!result.ok) throw new Error("expected the file");
    expect(result.contentDisposition).toBe('attachment; filename="juristrack-2026-10-19-to-2026-10-23.csv"');
    expect(new Uint8Array(await result.blob.arrayBuffer()).slice(0, 3)).toEqual(new Uint8Array([0xef, 0xbb, 0xbf]));
  });

  it("turns a problem+json refusal (422 EXPORT_TOO_LARGE) into a failure with its code", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: 422, code: "EXPORT_TOO_LARGE", detail: "This export has 9 rows; at most 5 fit in one file." }), {
      status: 422, headers: { "content-type": "application/problem+json" },
    })));
    const result = await clientWith().file("/reports/workdays", "text/csv");
    expect(result).toEqual({ ok: false, code: "EXPORT_TOO_LARGE", error: "hi:This export has 9 rows; at most 5 fit in one file." });
  });

  it("keeps the field errors of a 400 (a time zone the business does not offer)", async () => {
    stubFetch(400, { status: 400, code: "VALIDATION_FAILED", detail: "Some details are invalid.", errors: [{ field: "timeZone", message: "Choose the business time zone or one of its display time zones." }] });
    const result = await clientWith().file("/reports/workdays?timeZone=Mars%2FBase", "text/csv");
    expect(result).toMatchObject({ ok: false, errors: [{ field: "timeZone", message: "hi:Choose the business time zone or one of its display time zones." }] });
  });

  it("renews the session once on a 401 and asks again", async () => {
    const fetchStub = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 401, detail: "expired" }), { status: 401, headers: { "content-type": "application/problem+json" } }))
      .mockResolvedValueOnce(new Response(CSV, { status: 200, headers: { "content-type": "text/csv" } }));
    vi.stubGlobal("fetch", fetchStub);
    const onUnauthorized = vi.fn(async () => true);
    const result = await createApiClient({ basePath: "/base", getHeaders: () => ({}), onUnauthorized, queryClient: new QueryClient() }).file("/reports/workdays", "text/csv");
    expect(onUnauthorized).toHaveBeenCalledWith({ isQuiet: false });
    expect(fetchStub).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ ok: true, contentDisposition: null });
  });

  it("treats a JSON answer to a file request as a failure", async () => {
    stubFetch(200, { ok: true, data: { rows: [] } });
    expect(await clientWith().file("/reports/workdays", "text/csv")).toEqual({ ok: false, error: "hi:Something went wrong. Please try again." });
  });
});
