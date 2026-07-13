import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CalendarPage from "./page";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : ""} {...props}>
      {children}
    </a>
  )
}));

describe("CalendarPage", () => {
  it("renders the calendar heading and monthly view", async () => {
    render(await CalendarPage());

    expect(screen.getByRole("heading", { name: "Calendar", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Monthly view")).toBeInTheDocument();
  });
});
