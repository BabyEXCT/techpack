import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : ""} {...props}>
      {children}
    </a>
  )
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn()
  })
}));

import NewCustomerPage from "./page";

describe("NewCustomerPage", () => {
  it("renders the new customer heading and form fields", async () => {
    render(<NewCustomerPage />);

    expect(screen.getByRole("heading", { name: "New customer" })).toBeInTheDocument();
    expect(screen.getByLabelText("Customer name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save customer" })).toBeInTheDocument();
  });
});
