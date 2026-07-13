import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  customerFindMany: vi.fn()
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : ""} {...props}>
      {children}
    </a>
  )
}));

vi.mock("@/lib/db", () => ({
  db: {
    customer: {
      findMany: dbMocks.customerFindMany
    }
  }
}));

import CustomersPage from "@/app/customers/page";

describe("CustomersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the customers heading, search, and linked customer activity", async () => {
    dbMocks.customerFindMany.mockResolvedValueOnce([
      {
        id: "customer-1",
        name: "Aida Sports",
        companyName: "Aida Sportswear",
        phone: "012-3332221",
        updatedAt: new Date("2026-06-18T10:00:00.000Z"),
        jobs: [{ id: "job-1" }, { id: "job-2" }],
        invoices: [
          { id: "invoice-1", total: 320.5, paymentStatus: "SENT" },
          { id: "invoice-2", total: 100, paymentStatus: "PAID" }
        ]
      }
    ]);

    render(await CustomersPage());

    expect(screen.getByRole("heading", { name: "Customers" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New customer" })).toHaveAttribute("href", "/customers/new");
    expect(screen.getByPlaceholderText("Search customers")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Aida Sports" })).toHaveAttribute("href", "/customers/customer-1");
    expect(screen.getByText("Aida Sportswear")).toBeInTheDocument();
    expect(screen.getByText("2 jobs")).toBeInTheDocument();
    expect(screen.getByText("2 invoices")).toBeInTheDocument();
    expect(screen.getByText("RM 320.50")).toBeInTheDocument();
    expect(dbMocks.customerFindMany).toHaveBeenCalledWith({
      orderBy: { updatedAt: "desc" },
      include: { jobs: true, invoices: true }
    });
  });
});
