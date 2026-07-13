import { describe, it, expect } from "vitest";
import { fillTemplate } from "../templates";

describe("fillTemplate", () => {
  it("substitutes known placeholders", () => {
    const out = fillTemplate("Hi {{customerName}}, {{projectName}} ready", {
      customerName: "John",
      projectName: "FC Jersey"
    });
    expect(out).toBe("Hi John, FC Jersey ready");
  });

  it("leaves unknown placeholders empty", () => {
    expect(fillTemplate("{{nope}} here")).toBe(" here");
  });
});
