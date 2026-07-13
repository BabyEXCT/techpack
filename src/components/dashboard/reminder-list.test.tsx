import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReminderList } from "./reminder-list";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : ""} {...props}>
      {children}
    </a>
  )
}));

describe("ReminderList", () => {
  it("renders system reminders ordered as dashboard to-dos", () => {
    render(
      <ReminderList
        reminders={[
          {
            id: "r1",
            type: "approval",
            title: "Approval due for Team Alpha",
            subtitle: "Alpha Sports",
            actionHref: "/jobs/job-1/review"
          }
        ]}
      />
    );

    expect(screen.getByRole("heading", { name: "To-do reminders" })).toBeInTheDocument();
    expect(screen.getByText("Approval due for Team Alpha")).toBeInTheDocument();
  });
});
