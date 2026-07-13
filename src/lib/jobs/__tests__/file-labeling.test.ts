import { describe, expect, it } from "vitest";

import { detectFileLabel, detectMockupVariant } from "../file-labeling";

describe("detectFileLabel", () => {
  it("detects color code from filename keywords", () => {
    expect(detectFileLabel("polo-colorcode.jpg")).toBe("colorcode");
    expect(detectFileLabel("polo-pantone.png")).toBe("colorcode");
  });

  it("detects cut pieces from filename keywords", () => {
    expect(detectFileLabel("polo-cutpiece.jpg")).toBe("cutpiece");
  });

  it("detects mockup from filename keywords", () => {
    expect(detectFileLabel("polo-mockup-front.jpg")).toBe("mockup");
  });

  it("falls back to unknown when no supported keyword exists", () => {
    expect(detectFileLabel("polo-reference.jpg")).toBe("unknown");
  });
});

describe("detectMockupVariant", () => {
  it("detects combined mockup variants", () => {
    expect(detectMockupVariant("polo-mockup-front-back.jpg")).toBe("combined");
    expect(detectMockupVariant("polo-mockup-full.jpg")).toBe("combined");
  });

  it("detects front and back variants", () => {
    expect(detectMockupVariant("polo-mockup-front.jpg")).toBe("front");
    expect(detectMockupVariant("polo-mockup-back.jpg")).toBe("back");
  });

  it("returns single when no side marker exists", () => {
    expect(detectMockupVariant("polo-mockup.jpg")).toBe("single");
  });
});
