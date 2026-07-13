import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  invoiceFindMany: vi.fn()
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : ""} {...props}>{children}</a>
  )
}));

vi.mock("@/lib/db", () => ({
  db: {
    invoice: {
      findMany: dbMocks.invoiceFindMany
    }
  }
}));

import InvoicesPage from "@/app/invoices/page";

describe("InvoicesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders invoice tracking sections with recent invoice cards", async () => {
    dbMocks.invoiceFindMany.mockResolvedValueOnce([
      {
        id: "invoice-1",
        invoiceNumber: "INV-001",
        total: 420.5,
        paymentStatus: "SENT",
        createdAt: new Date("2026-06-18T10:00:00.000Z"),
        customer: { id: "customer-1", name: "Aida Sports" },
        jobs: [{ id: "job-1" }, { id: "job-2" }]
      }
    ]);

    render(await InvoicesPage());

    expect(screen.getByRole("heading", { name: "Invoices" })).toBeInTheDocument();
    expect(screen.getByText("INV-001")).toBeInTheDocument();
    expect(screen.getByText("Aida Sports")).toBeInTheDocument();
    expect(screen.getByText("RM 420.50")).toBeInTheDocument();
    expect(dbMocks.invoiceFindMany).toHaveBeenCalled();
  });
});
