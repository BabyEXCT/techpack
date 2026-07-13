// Utilities for making text safe to render with pdf-lib StandardFonts (WinAnsi).
// These fonts cannot encode many Unicode characters (emoji, zero-width chars, etc).

export function toPdfSafeText(input: unknown, maxLen?: number) {
  if (input === null || input === undefined) return "";
  let text = String(input);

  // Remove common invisible/zero-width characters that often appear in WhatsApp copy-paste.
  text = text.replace(/[\u200B-\u200D\uFEFF\u2060]/g, "");

  // Remove control characters except tab/newline.
  text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

  // WinAnsi fonts in pdf-lib support a limited set; remove chars outside Latin-1.
  text = text.replace(/[^\u0009\u000A\u000D\u0020-\u007E\u00A0-\u00FF]/g, "");

  // Normalize whitespace
  text = text.replace(/\s+/g, " ").trim();

  if (typeof maxLen === "number" && Number.isFinite(maxLen) && maxLen > 0) {
    text = text.slice(0, maxLen);
  }

  return text;
}

