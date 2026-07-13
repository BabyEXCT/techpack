import { describe, expect, it } from "vitest";
import { isValidTransition, ALLOWED_TRANSITIONS, InvoiceStatus } from "../status-transitions";

describe("isValidTransition", () => {
  it("allows DRAFT → SENT", () => {
    expect(isValidTransition("DRAFT", "SENT")).toBe(true);
  });

  it("rejects DRAFT → PAID (skips SENT)", () => {
    expect(isValidTransition("DRAFT", "PAID")).toBe(false);
  });

  it("allows SENT → PARTIALLY_PAID", () => {
    expect(isValidTransition("SENT", "PARTIALLY_PAID")).toBe(true);
  });

  it("allows PARTIALLY_PAID → PAID", () => {
    expect(isValidTransition("PARTIALLY_PAID", "PAID")).toBe(true);
  });

  it("rejects PAID → any (terminal)", () => {
    expect(isValidTransition("PAID", "SENT")).toBe(false);
    expect(isValidTransition("PAID", "OVERDUE")).toBe(false);
  });

  it("allows OVERDUE → PAID", () => {
    expect(isValidTransition("OVERDUE", "PAID")).toBe(true);
  });
});
