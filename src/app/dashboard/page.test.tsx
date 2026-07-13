import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DashboardPage from "@/app/dashboard/page";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : ""} {...props}>
      {children}
    </a>
  )
}));

describe("DashboardPage", () => {
  it("renders the redesigned dashboard overview, reminder, calendar, and operational panels", async () => {
    render(await DashboardPage());

    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "To-do reminders" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Calendar" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recent customers" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Active jobs" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Unpaid invoices" })).toBeInTheDocument();
  });
});
