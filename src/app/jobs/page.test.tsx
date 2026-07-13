import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import JobsPage from "@/app/jobs/page";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : ""} {...props}>
      {children}
    </a>
  )
}));

vi.mock("@/components/jobs/jobs-list", () => ({
  JobsList: () => <div>Jobs list content</div>
}));

describe("JobsPage", () => {
  it("renders bin and new job actions", () => {
    render(<JobsPage />);

    expect(screen.getByRole("heading", { name: "Jobs" })).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: "Bin" })
        .some((link) => link.getAttribute("href") === "/jobs/bin")
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: "New job" })
        .some((link) => link.getAttribute("href") === "/jobs/new")
    ).toBe(true);
    expect(screen.getByText("Jobs list content")).toBeInTheDocument();
  });
});
