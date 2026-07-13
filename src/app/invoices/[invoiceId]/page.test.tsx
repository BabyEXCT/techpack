import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  invoiceFindUnique: vi.fn()
}));

const notFoundMock = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  })
);

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : ""} {...props}>
      {children}
    </a>
  )
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  useRouter: () => ({ refresh: vi.fn() })
}));

vi.mock("@/lib/db", () => ({
  db: {
    invoice: {
      findUnique: dbMocks.invoiceFindUnique
    }
  }
}));

import InvoiceDetailPage from "@/app/invoices/[invoiceId]/page";

describe("InvoiceDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a printable invoice preview for the selected invoice", async () => {
    dbMocks.invoiceFindUnique.mockResolvedValueOnce({
      id: "invoice-1",
      invoiceNumber: "INV-001",
      subtotal: 400,
      total: 420.5,
      paymentStatus: "SENT",
      notes: "50% deposit due before production",
      createdAt: new Date("2026-06-18T10:00:00.000Z"),
      customer: {
        id: "customer-1",
        name: "Aida Sports"
      },
      jobs: [
        { id: "job-1", projectName: "Away kit 2026" },
        { id: "job-2", projectName: "Training tee restock" }
      ]
    });

    render(await InvoiceDetailPage({ params: Promise.resolve({ invoiceId: "invoice-1" }) }));

    expect(screen.getByRole("link", { name: "All invoices" })).toHaveAttribute("href", "/invoices");
    expect(screen.getAllByRole("heading", { name: "Invoice INV-001" }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Aida Sports")).toBeInTheDocument();
    expect(screen.getByText("Away kit 2026")).toBeInTheDocument();
    expect(screen.getByText("Training tee restock")).toBeInTheDocument();
    expect(screen.getByText("Subtotal: RM 400.00")).toBeInTheDocument();
    expect(screen.getByText("Total: RM 420.50")).toBeInTheDocument();
    expect(screen.getByText("Sent")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument();
    expect(dbMocks.invoiceFindUnique).toHaveBeenCalledWith({
      where: { id: "invoice-1" },
      include: { customer: true, jobs: true }
    });
  });

  it("delegates to notFound when the invoice record does not exist", async () => {
    dbMocks.invoiceFindUnique.mockResolvedValueOnce(null);

    await expect(
      InvoiceDetailPage({ params: Promise.resolve({ invoiceId: "missing-invoice" }) })
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });
});
