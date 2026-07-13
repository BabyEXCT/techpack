import { describe, expect, it } from "vitest";

import { detectStyleLabel } from "../style-keywords";

describe("detectStyleLabel", () => {
  it("detects muslimah", () => {
    expect(detectStyleLabel("cutting muslimah")).toBe("Muslimah");
  });

  it("detects polo", () => {
    expect(detectStyleLabel("standard with polo collar")).toBe("Polo");
  });

  it("detects round neck long sleeve", () => {
    expect(detectStyleLabel("round neck long sleeve")).toBe("Round Neck Long Sleeve");
  });

  it("returns empty string when no supported style keyword exists", () => {
    expect(detectStyleLabel("size S")).toBe("");
  });
});
