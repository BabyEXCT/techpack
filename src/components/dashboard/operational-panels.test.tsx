import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OperationalPanels } from "./operational-panels";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : ""} {...props}>
      {children}
    </a>
  )
}));

describe("OperationalPanels", () => {
  it("renders quick-link panels for customers, jobs, and invoices", () => {
    render(<OperationalPanels />);

    expect(screen.getByRole("heading", { name: "Recent customers" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Active jobs" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Unpaid invoices" })).toBeInTheDocument();

    expect(screen.getByText("Customer records will appear here.")).toBeInTheDocument();
    expect(screen.getByText("Open jobs and current stage will appear here.")).toBeInTheDocument();
    expect(screen.getByText("Outstanding invoices will appear here.")).toBeInTheDocument();
  });
});
