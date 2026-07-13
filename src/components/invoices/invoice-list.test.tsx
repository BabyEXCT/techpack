import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InvoiceList } from "@/components/invoices/invoice-list";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : ""} {...props}>
      {children}
    </a>
  )
}));

describe("InvoiceList", () => {
  it("renders recent invoice cards with payment status, totals, and view actions", () => {
    render(
      <InvoiceList
        invoices={[
          {
            id: "invoice-1",
            invoiceNumber: "INV-001",
            customerName: "Aida Sports",
            total: 420.5,
            paymentStatus: "SENT",
            jobCount: 2
          },
          {
            id: "invoice-2",
            invoiceNumber: "INV-002",
            customerName: "Bintang FC",
            total: 180,
            paymentStatus: "DRAFT",
            jobCount: 1
          }
        ]}
      />
    );

    expect(screen.getByRole("link", { name: "INV-001 Aida Sports" })).toHaveAttribute("href", "/invoices/invoice-1");
    expect(screen.getByText("Aida Sports")).toBeInTheDocument();
    expect(screen.getByText("2 jobs")).toBeInTheDocument();
    expect(screen.getByText("RM 420.50")).toBeInTheDocument();
    expect(screen.getByText("Sent")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "INV-002 Bintang FC" })).toHaveAttribute("href", "/invoices/invoice-2");
    expect(screen.getByText("Bintang FC")).toBeInTheDocument();
    expect(screen.getByText("1 job")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("shows an empty state when there are no invoices to display", () => {
    render(<InvoiceList invoices={[]} />);

    expect(screen.getByText("No invoices yet")).toBeInTheDocument();
    expect(screen.getByText("Create an invoice to track totals, payment status, and printable previews.")).toBeInTheDocument();
  });
});
