const STYLE_RULES = [
  { label: "Muslimah", keywords: ["muslimah"] },
  { label: "Polo", keywords: ["polo"] },
  { label: "Round Neck Long Sleeve", keywords: ["round neck", "long sleeve"] }
];

function normalizeText(input: string) {
  return input.toLowerCase().replace(/\s+/g, " ").trim();
}

export function detectStyleLabel(line: string) {
  const normalized = normalizeText(line);

  for (const rule of STYLE_RULES) {
    if (rule.keywords.every((keyword) => normalized.includes(keyword))) {
      return rule.label;
    }
  }

  return "";
}
