import { describe, expect, it } from "vitest";
import { parseWhatsAppOrder } from "../parse-whatsapp";

describe("parseWhatsAppOrder", () => {
  it("extracts roster rows from simple lines", () => {
    const result = parseWhatsAppOrder("Azlan Shah 14 M\nIwan 24 L");

    expect(result.roster).toEqual([
      { rowNumber: 1, name: "Azlan Shah", number: "14", size: "M", qty: 1, remarks: "" },
      { rowNumber: 2, name: "Iwan", number: "24", size: "L", qty: 1, remarks: "" }
    ]);
  });

  it("counts totals by size", () => {
    const result = parseWhatsAppOrder("Azlan Shah 14 M\nIwan 24 L\nMode 92 M");

    expect(result.sizeTotals).toEqual({
      M: 2,
      L: 1
    });
  });

  it("handles whatsapp bullet format with qty and size in parentheses", () => {
    const result = parseWhatsAppOrder(
      "- LUFFY K (XL) x2 ✅ (1-retro collar)\n- Naz(2XL)x1✅"
    );

    expect(result.roster).toEqual([
      {
        rowNumber: 1,
        name: "LUFFY K",
        number: "",
        size: "XL",
        qty: 2,
        remarks: "1-retro collar"
      },
      {
        rowNumber: 2,
        name: "Naz",
        number: "",
        size: "2XL",
        qty: 1,
        remarks: ""
      }
    ]);

    expect(result.sizeTotals).toEqual({
      XL: 2,
      "2XL": 1
    });
  });

  it("inherits grouped size headings for numbered rows", () => {
    const result = parseWhatsAppOrder(
      "size S\n1. ALYAA - 13\n2. TIKAH - 04\n\nsize M\n1. AIMI - 21"
    );

    expect(result.roster).toEqual([
      { rowNumber: 1, name: "ALYAA", number: "13", size: "S", qty: 1, remarks: "" },
      { rowNumber: 2, name: "TIKAH", number: "04", size: "S", qty: 1, remarks: "" },
      { rowNumber: 3, name: "AIMI", number: "21", size: "M", qty: 1, remarks: "" }
    ]);

    expect(result.sizeTotals).toEqual({ S: 2, M: 1 });
  });

  it("marks grouped rows without a usable size as needing review", () => {
    const result = parseWhatsAppOrder("1. ALYAA - 13\n2. TIKAH - 04");

    expect(result.roster).toEqual([
      { rowNumber: 1, name: "ALYAA", number: "13", size: "", qty: 1, remarks: "needs_review" },
      { rowNumber: 2, name: "TIKAH", number: "04", size: "", qty: 1, remarks: "needs_review" }
    ]);

    expect(result.sizeTotals).toEqual({});
  });

  it("splits mixed-style whatsapp text into item groups", () => {
    const result = parseWhatsAppOrder(
      "cutting muslimah\nsize S\n1. ALYAA - 13\n\nround neck long sleeve\nsize M\n1. AIMI - 21"
    );

    expect(result.items).toEqual([
      expect.objectContaining({
        name: "Muslimah",
        roster: [expect.objectContaining({ name: "ALYAA", size: "S" })]
      }),
      expect.objectContaining({
        name: "Round Neck Long Sleeve",
        roster: [expect.objectContaining({ name: "AIMI", size: "M" })]
      })
    ]);
  });


  it("captures trailing tokens as remarks", () => {
    const result = parseWhatsAppOrder("Azlan 14 M GK");
    expect(result.roster[0]).toEqual({
      rowNumber: 1,
      name: "Azlan",
      number: "14",
      size: "M",
      qty: 1,
      remarks: "GK"
    });
  });
});
