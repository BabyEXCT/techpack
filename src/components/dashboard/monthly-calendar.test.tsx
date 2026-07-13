import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MonthlyCalendar } from "./monthly-calendar";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : ""} {...props}>
      {children}
    </a>
  )
}));

describe("MonthlyCalendar", () => {
  it("renders monthly events for approval and delivery dates", () => {
    render(
      <MonthlyCalendar
        monthLabel="June 2026"
        today={19}
        events={[
          { id: "a1", day: 12, kind: "approval", label: "Team Alpha", href: "/jobs/job-1/review" },
          { id: "d1", day: 14, kind: "delivery", label: "Team Alpha", href: "/jobs/job-1/review" }
        ]}
      />
    );

    expect(screen.getByRole("heading", { name: "Calendar" })).toBeInTheDocument();
    expect(screen.getAllByText("Team Alpha")).toHaveLength(2);
  });
});
