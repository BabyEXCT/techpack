import { describe, expect, it } from "vitest";

import { detectMockupRole } from "../mockup-role";

describe("detectMockupRole", () => {
  it("detects front keywords", () => {
    expect(detectMockupRole("jersey-front.png")).toBe("front");
    expect(detectMockupRole("design-depan.jpg")).toBe("front");
  });

  it("detects back keywords", () => {
    expect(detectMockupRole("jersey-back.png")).toBe("back");
    expect(detectMockupRole("design-belakang.jpg")).toBe("back");
  });

  it("leaves unclear filenames unassigned", () => {
    expect(detectMockupRole("mockup-final.png")).toBe("unassigned");
  });
});
