import { describe, expect, it } from "vitest";
import { getMissingRequiredFields } from "../required-fields";

describe("getMissingRequiredFields", () => {
  it("returns required top-level fields before generation", () => {
    const result = getMissingRequiredFields({
      projectName: "",
      category: "",
      roster: []
    });

    expect(result).toEqual(["projectName", "category", "roster"]);
  });

  it("can require artwork files when generating supplier tech pack", () => {
    const result = getMissingRequiredFields(
      {
        projectName: "Kraxtom FC",
        category: "Sublimation",
        roster: [{ name: "Azlan", number: "14", size: "M" }],
        artworkFiles: []
      },
      { requireArtwork: true }
    );

    expect(result).toContain("artworkFiles");
  });
});
