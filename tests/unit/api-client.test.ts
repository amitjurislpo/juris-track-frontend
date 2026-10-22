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
