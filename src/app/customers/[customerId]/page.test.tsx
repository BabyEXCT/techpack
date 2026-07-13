import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  customerFindUnique: vi.fn()
}));

const notFoundMock = vi.hoisted(() => vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : ""} {...props}>
      {children}
    </a>
  )
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock
}));

vi.mock("@/lib/db", () => ({
  db: {
    customer: {
      findUnique: dbMocks.customerFindUnique
    }
  }
}));

import CustomerDetailPage from "@/app/customers/[customerId]/page";

describe("CustomerDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders profile, jobs, and invoices sections for the selected customer", async () => {
    dbMocks.customerFindUnique.mockResolvedValueOnce({
      id: "customer-1",
      name: "Aida Sports",
      companyName: "Aida Sportswear",
      phone: "012-3332221",
      email: "hello@aida.test",
      address: "Lot 3, Shah Alam",
      preferredPaymentMethod: "Maybank transfer",
      deliveryNote: "Leave with guard house",
      notes: "Prefers WhatsApp updates",
      jobs: [
        {
          id: "job-1",
          projectName: "Away kit 2026",
          workflowStage: "WAITING_APPROVAL",
          priority: "URGENT",
          updatedAt: new Date("2026-06-18T10:00:00.000Z")
        }
      ],
      invoices: [
        {
          id: "invoice-1",
          invoiceNumber: "INV-001",
          total: 320.5,
          paymentStatus: "SENT",
          createdAt: new Date("2026-06-18T10:00:00.000Z")
        }
      ]
    });

    render(await CustomerDetailPage({ params: Promise.resolve({ customerId: "customer-1" }) }));

    expect(screen.getByRole("heading", { name: "Aida Sports" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Jobs" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Invoices" })).toBeInTheDocument();
    expect(screen.getByText("Maybank transfer")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Away kit 2026" })).toHaveAttribute("href", "/jobs/job-1/review");
    expect(screen.getByRole("link", { name: "INV-001" })).toHaveAttribute("href", "/invoices/invoice-1");
    expect(screen.getAllByText("RM 320.50").length).toBeGreaterThan(0);
    expect(dbMocks.customerFindUnique).toHaveBeenCalledWith({
      where: { id: "customer-1" },
      include: {
        jobs: {
          orderBy: { updatedAt: "desc" }
        },
        invoices: {
          orderBy: { createdAt: "desc" }
        }
      }
    });
  });

  it("delegates to notFound when the customer record does not exist", async () => {
    dbMocks.customerFindUnique.mockResolvedValueOnce(null);

    await expect(
      CustomerDetailPage({ params: Promise.resolve({ customerId: "missing-customer" }) })
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });
});
