import { describe, expect, it } from "vitest";
import { buildSizeTotals } from "../size-totals";

describe("buildSizeTotals", () => {
  it("groups roster rows by size", () => {
    const result = buildSizeTotals([{ size: "M" }, { size: "L" }, { size: "m" }]);

    expect(result).toEqual({ M: 2, L: 1 });
  });

  it("sums qty when provided", () => {
    const result = buildSizeTotals([
      { size: "XL", qty: 2 },
      { size: "xl", qty: 1 },
      { size: "M", qty: 3 }
    ]);

    expect(result).toEqual({ XL: 3, M: 3 });
  });
});
