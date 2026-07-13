import { render, screen } from "@testing-library/react";
import { AppShell } from "@/components/layout/app-shell";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : ""} {...props}>
      {children}
    </a>
  )
}));

describe("AppShell", () => {
  it("renders the app title, sidebar navigation, mobile navigation, and child content", () => {
    render(
      <AppShell>
        <div>Jobs page</div>
      </AppShell>
    );

    expect(screen.getAllByText("Tech Pack")).toHaveLength(2);
    expect(screen.getAllByText("Operations")).toHaveLength(2);
    expect(screen.getByRole("navigation", { name: "Sidebar" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Mobile" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Calendar" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Dashboard" })).toHaveLength(2);
    expect(screen.queryByRole("navigation", { name: "Primary" })).not.toBeInTheDocument();
    expect(screen.getByText("Jobs page")).toBeInTheDocument();
  });
});
