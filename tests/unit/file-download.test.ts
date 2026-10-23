import { describe, expect, it } from "vitest";
import { fileNameFromContentDisposition } from "@/track/lib/file-download";

const FALLBACK = "juristrack-2026-10-19-to-2026-10-23.csv";

describe("the file name of a Content-Disposition header", () => {
  it("reads the API's quoted file name", () => {
    expect(fileNameFromContentDisposition('attachment; filename="juristrack-2026-10-01-to-2026-10-07.csv"', FALLBACK)).toBe("juristrack-2026-10-01-to-2026-10-07.csv");
  });

  it("reads a bare file name and ignores what follows it", () => {
    expect(fileNameFromContentDisposition("attachment; filename=report.csv; size=120", FALLBACK)).toBe("report.csv");
  });

  it("prefers the RFC 5987 encoded name (UTF-8, percent-encoded)", () => {
    expect(fileNameFromContentDisposition("attachment; filename=\"report.csv\"; filename*=UTF-8''r%C3%A9sum%C3%A9%20Okt.csv", FALLBACK)).toBe("résumé Okt.csv");
    expect(fileNameFromContentDisposition("attachment; FILENAME*=utf-8'en'plain.csv", FALLBACK)).toBe("plain.csv");
  });

  it("falls back to the plain name when the encoded one is broken", () => {
    expect(fileNameFromContentDisposition("attachment; filename*=UTF-8''%E0%A4%A; filename=\"safe.csv\"", FALLBACK)).toBe("safe.csv");
  });

  it("undoes quoted-string escapes", () => {
    expect(fileNameFromContentDisposition('attachment; filename="say \\"hi\\".csv"', FALLBACK)).toBe("say _hi_.csv");
  });

  it("never lets a name reach outside the downloads folder or use reserved characters", () => {
    expect(fileNameFromContentDisposition('attachment; filename="../../etc/passwd"', FALLBACK)).toBe("_.._etc_passwd");
    expect(fileNameFromContentDisposition('attachment; filename="a:b*c?.csv"', FALLBACK)).toBe("a_b_c_.csv");
  });

  it("uses the fallback when there is no header or no usable name", () => {
    expect(fileNameFromContentDisposition(null, FALLBACK)).toBe(FALLBACK);
    expect(fileNameFromContentDisposition("", FALLBACK)).toBe(FALLBACK);
    expect(fileNameFromContentDisposition("attachment", FALLBACK)).toBe(FALLBACK);
    expect(fileNameFromContentDisposition('attachment; filename=""', FALLBACK)).toBe(FALLBACK);
    expect(fileNameFromContentDisposition('attachment; filename="..."', FALLBACK)).toBe(FALLBACK);
  });

  it("does not take the name of another parameter that ends in filename", () => {
    expect(fileNameFromContentDisposition('attachment; xfilename="evil.exe"', FALLBACK)).toBe(FALLBACK);
  });
});
