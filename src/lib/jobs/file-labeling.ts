export type SectionFileLabel = "mockup" | "cutpiece" | "colorcode" | "unknown";
export type MockupVariant = "front" | "back" | "combined" | "single";

function normalizeFilename(name: string) {
  return name.toLowerCase().replace(/[_\s.]+/g, "-");
}

export function detectFileLabel(name: string): SectionFileLabel {
  const normalized = normalizeFilename(name);

  if (/(colorcode|colour|color|pantone|code)/.test(normalized)) {
    return "colorcode";
  }

  if (/(cutpiece|cut-piece|cut|pieces)/.test(normalized)) {
    return "cutpiece";
  }

  if (/(mockup|jersey|front|back|full)/.test(normalized)) {
    return "mockup";
  }

  return "unknown";
}

export function detectMockupVariant(name: string): MockupVariant {
  const normalized = normalizeFilename(name);

  if (/(front-back|full)/.test(normalized)) {
    return "combined";
  }

  if (/\bfront\b/.test(normalized)) {
    return "front";
  }

  if (/\bback\b/.test(normalized)) {
    return "back";
  }

  return "single";
}
