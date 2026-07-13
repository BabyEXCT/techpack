import { describe, expect, it } from "vitest";

import { resolveItemMockup, resolveMockupFiles, splitSectionFilesByLabel } from "../item-assets";

describe("resolveItemMockup", () => {
  it("prefers a section mockup over the shared mockup", () => {
    const shared = [{ name: "shared.png", dataUrl: "data:image/png;base64,AAA" }];
    const section = [{ name: "polo.png", dataUrl: "data:image/png;base64,BBB" }];

    expect(resolveItemMockup(section, shared)).toEqual(section);
  });

  it("falls back to the shared mockup when a section mockup is missing", () => {
    const shared = [{ name: "shared.png", dataUrl: "data:image/png;base64,AAA" }];

    expect(resolveItemMockup([], shared)).toEqual(shared);
  });
});

describe("splitSectionFilesByLabel", () => {
  it("groups section files using chosenLabel instead of detectedLabel", () => {
    const files = [
      {
        name: "polo-mockup-front-back.jpg",
        dataUrl: "data:image/jpeg;base64,AAA",
        detectedLabel: "unknown" as const,
        chosenLabel: "mockup" as const,
        mockupVariant: "combined" as const
      },
      {
        name: "polo-cutpiece.jpg",
        dataUrl: "data:image/jpeg;base64,BBB",
        detectedLabel: "mockup" as const,
        chosenLabel: "cutpiece" as const
      },
      {
        name: "polo-colorcode.jpg",
        dataUrl: "data:image/jpeg;base64,CCC",
        detectedLabel: "unknown" as const,
        chosenLabel: "colorcode" as const
      }
    ];

    expect(splitSectionFilesByLabel(files)).toEqual({
      mockups: [expect.objectContaining({ name: "polo-mockup-front-back.jpg" })],
      cutPieces: [expect.objectContaining({ name: "polo-cutpiece.jpg" })],
      colorCodes: [expect.objectContaining({ name: "polo-colorcode.jpg" })]
    });
  });
});

describe("resolveMockupFiles", () => {
  it("prefers combined mockups over separate front and back files", () => {
    const mockups = [
      {
        name: "polo-mockup-front.jpg",
        dataUrl: "data:image/jpeg;base64,AAA",
        detectedLabel: "mockup" as const,
        chosenLabel: "mockup" as const,
        mockupVariant: "front" as const
      },
      {
        name: "polo-mockup-back.jpg",
        dataUrl: "data:image/jpeg;base64,BBB",
        detectedLabel: "mockup" as const,
        chosenLabel: "mockup" as const,
        mockupVariant: "back" as const
      },
      {
        name: "polo-mockup-front-back.jpg",
        dataUrl: "data:image/jpeg;base64,CCC",
        detectedLabel: "mockup" as const,
        chosenLabel: "mockup" as const,
        mockupVariant: "combined" as const
      }
    ];

    expect(resolveMockupFiles(mockups)).toEqual([expect.objectContaining({ name: "polo-mockup-front-back.jpg" })]);
  });
});
