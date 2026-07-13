export type MockupRole = "front" | "back" | "unassigned";

const FRONT_KEYWORDS = ["front", "depan"];
const BACK_KEYWORDS = ["back", "belakang"];

function normalizeFilename(name: string) {
  return name.toLowerCase().replace(/[_\-.]+/g, " ");
}

export function detectMockupRole(name: string): MockupRole {
  const normalized = normalizeFilename(name);

  if (FRONT_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return "front";
  }

  if (BACK_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return "back";
  }

  return "unassigned";
}
