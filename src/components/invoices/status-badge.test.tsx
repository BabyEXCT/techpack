import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  it("renders Draft with neutral styling", () => {
    render(<StatusBadge status="DRAFT" />);
    const badge = screen.getByText("Draft");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("bg-zinc-100");
  });
  it("renders Sent with blue styling", () => {
    render(<StatusBadge status="SENT" />);
    const badge = screen.getByText("Sent");
    expect(badge.className).toContain("bg-blue-50");
  });
  it("renders Paid with emerald styling", () => {
    render(<StatusBadge status="PAID" />);
    const badge = screen.getByText("Paid");
    expect(badge.className).toContain("bg-emerald-50");
  });
  it("renders Overdue with red styling", () => {
    render(<StatusBadge status="OVERDUE" />);
    const badge = screen.getByText("Overdue");
    expect(badge.className).toContain("bg-red-50");
  });
});
