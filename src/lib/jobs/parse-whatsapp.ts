import { detectStyleLabel } from "./style-keywords";
import { buildSizeTotals } from "./size-totals";
import type { SizeTotals } from "./size-totals";

const SIZE_PATTERN = /\b(3XS|2XS|XS|S|M|L|XL|2XL|3XL|4XL|5XL)\b/i;
const NUMBER_PATTERN = /^\d{1,3}$/;
const QTY_PATTERN = /\bx\s*(\d+)\b/i;
const BULLET_PREFIX = /^[\s\-•–—]+/;
const CHECKMARKS = /[✅✔️☑️]/g;
const GROUP_SIZE_PATTERN = /^size\s+(.+)$/i;
const NUMBERED_ROW_PATTERN = /^\d+\.\s*(.+?)(?:\s*-\s*(\d{1,3}))?$/;

export type ParsedRosterRow = {
  rowNumber: number;
  name: string;
  number: string;
  size: string;
  qty: number;
  remarks: string;
};

export type ParsedOrderItem = {
  name: string;
  cuttingType?: string;
  collarType?: string;
  material?: string;
  roster: ParsedRosterRow[];
  sizeTotals: SizeTotals;
};

function cleanLine(raw: string) {
  return raw
    .replace(BULLET_PREFIX, "")
    .replace(CHECKMARKS, "")
    .replace(/[\u200B-\u200D\uFEFF\u2060]/g, "")
    .replace(/\uFE0F/g, "") // variation selector
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSizeToken(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function normalizeHeadingSize(line: string) {
  const match = line.match(GROUP_SIZE_PATTERN);
  const candidate = match?.[1]?.trim() ?? "";
  const normalized = normalizeSizeToken(candidate);

  return candidate && SIZE_PATTERN.test(normalized) && normalized.length <= 4 ? normalized : "";
}

function markNeedsReview(remarks: string) {
  return [remarks, "needs_review"].filter(Boolean).join(" ; ");
}

function createParsedOrderItem(styleLabel: string): ParsedOrderItem {
  return {
    name: styleLabel,
    cuttingType: styleLabel === "Muslimah" ? "Muslimah" : "",
    collarType: styleLabel === "Polo" ? "Polo" : styleLabel === "Round Neck Long Sleeve" ? "Round Neck" : "",
    roster: [],
    sizeTotals: {}
  };
}

export function parseWhatsAppOrder(message: string) {
  const lines = message
    .split(/\r?\n/)
    .map((line) => cleanLine(line))
    .filter(Boolean);

  const roster: ParsedRosterRow[] = [];
  const items: ParsedOrderItem[] = [];
  let activeGroupedSize = "";
  let currentItem: ParsedOrderItem | null = null;

  function appendRow(row: ParsedRosterRow) {
    roster.push(row);
    currentItem?.roster.push(row);
  }

  for (const line of lines) {
    const styleLabel = detectStyleLabel(line);
    if (styleLabel) {
      currentItem = createParsedOrderItem(styleLabel);
      items.push(currentItem);
      activeGroupedSize = "";
      continue;
    }

    const groupedSize = normalizeHeadingSize(line);
    if (groupedSize) {
      activeGroupedSize = groupedSize;
      continue;
    }

    const numbered = line.match(NUMBERED_ROW_PATTERN);
    if (numbered) {
      const name = (numbered[1] ?? "").trim();
      const number = (numbered[2] ?? "").trim();
      const size = activeGroupedSize;

      appendRow({
        rowNumber: roster.length + 1,
        name,
        number,
        size,
        qty: 1,
        remarks: size ? "" : markNeedsReview("")
      });
      continue;
    }

    // Extract qty (x2, x 2, etc) before tokenization so it doesn't get mistaken as jersey number.
    const qtyMatch = line.match(QTY_PATTERN);
    const qty = qtyMatch ? Math.max(1, Number.parseInt(qtyMatch[1] ?? "1", 10) || 1) : 1;
    let working = qtyMatch ? line.replace(qtyMatch[0], "").trim() : line;

    // Extract parenthesis notes. Use them as remarks unless they are just the size.
    const remarkParts: string[] = [];
    let sizeFromParen = "";
    const parens = Array.from(working.matchAll(/\(([^)]*)\)/g)).map((m) => (m[1] ?? "").trim());
    for (const content of parens) {
      if (!content) continue;
      // If the parenthesis contains ONLY the size token, don't treat it as a remark.
      const contentNoSpace = content.replace(/\s+/g, "").toUpperCase();
      if (SIZE_PATTERN.test(contentNoSpace) && contentNoSpace.length <= 4) {
        sizeFromParen = contentNoSpace;
        continue;
      }
      remarkParts.push(content);
    }
    working = working.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();

    // Remove common separators used in WhatsApp messages.
    working = working.replace(/[–—-]+/g, " ").replace(/\s+/g, " ").trim();

    const tokens = working.split(/\s+/).filter(Boolean);

    const sizeIndex = sizeFromParen ? -1 : tokens.findIndex((token) => SIZE_PATTERN.test(token));
    const numberIndex = tokens.findIndex((token) => NUMBER_PATTERN.test(token));

    const size = sizeIndex >= 0 ? tokens[sizeIndex].toUpperCase() : sizeFromParen;
    const number = numberIndex >= 0 ? tokens[numberIndex] : "";

    const firstDataIndex = Math.min(
      ...(Array.from([sizeIndex, numberIndex]).filter((v) => v >= 0) as number[])
    );

    const nameEndIndex = Number.isFinite(firstDataIndex) ? firstDataIndex : tokens.length;
    const nameTokens = tokens.slice(0, nameEndIndex);

    const lastDataIndex = Math.max(sizeIndex, numberIndex);
    const remarksTokens = lastDataIndex >= 0 ? tokens.slice(lastDataIndex + 1) : [];

    appendRow({
      rowNumber: roster.length + 1,
      name: nameTokens.join(" ").trim(),
      number,
      size,
      qty,
      remarks: [...remarkParts, remarksTokens.join(" ").trim()].filter(Boolean).join(" ; ")
    });
  }

  for (const item of items) {
    item.sizeTotals = buildSizeTotals(item.roster);
  }

  const sizeTotals = buildSizeTotals(roster);

  return { roster, sizeTotals, items };
}
