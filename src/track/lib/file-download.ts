/**
 * Saving a file the API sent (a CSV export): the API names it in `Content-Disposition`; the browser saves the blob under that
 * name. Files are always built by the API, never in the browser.
 */

/** Characters a file name must not contain on any common system (and control characters). */
// eslint-disable-next-line no-control-regex
const UNSAFE_FILE_NAME_CHARACTERS = /[\u0000-\u001f\u007f<>:"/\\|?*]/g;

function safeFileName(fileName: string): string {
  return fileName.replace(UNSAFE_FILE_NAME_CHARACTERS, "_").replace(/^[.\s]+|[.\s]+$/g, "").trim();
}

/**
 * The file name of a `Content-Disposition` header (RFC 6266): `filename*=UTF-8''…` (percent-encoded) wins over `filename="…"`
 * (quoted, with `\"` escapes) or a bare `filename=…`. Anything unsafe in a file name is replaced; `fallback` when the header is
 * missing or names nothing usable.
 */
export function fileNameFromContentDisposition(header: string | null | undefined, fallback: string): string {
  if (!header) return fallback;
  const encoded = /(?:^|;)\s*filename\*\s*=\s*[^']*'[^']*'([^;]+)/i.exec(header);
  if (encoded) {
    try {
      const decoded = safeFileName(decodeURIComponent(encoded[1].trim().replace(/^"|"$/g, "")));
      if (decoded) return decoded;
    } catch {
      // a broken percent-encoding: try the plain filename
    }
  }
  const quoted = /(?:^|;)\s*filename\s*=\s*"((?:[^"\\]|\\.)*)"/i.exec(header);
  const bare = /(?:^|;)\s*filename\s*=\s*([^";]+)/i.exec(header);
  const plain = quoted ? quoted[1].replace(/\\(.)/g, "$1") : bare?.[1].trim();
  const fileName = plain ? safeFileName(plain) : "";
  return fileName || fallback;
}

/** Hands the blob to the browser as a download named `fileName` (a temporary object URL, released right after). */
export function saveFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // the download has started from the click; give the browser a moment before releasing the blob
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
