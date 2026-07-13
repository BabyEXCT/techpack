import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InvoicePreview } from "@/components/invoices/invoice-preview";

describe("InvoicePreview", () => {
  it("renders a printable invoice summary with jobs, totals, notes, and payment status", () => {
    render(
      <InvoicePreview
        invoiceNumber="INV-001"
        customerName="Aida Sports"
        subtotal={400}
        total={420.5}
        paymentStatus="Sent"
        notes="50% deposit due before production"
        jobs={["Away kit 2026", "Training tee restock"]}
      />
    );

    expect(screen.getByRole("heading", { name: "Invoice INV-001" })).toBeInTheDocument();
    expect(screen.getByText("Aida Sports")).toBeInTheDocument();
    expect(screen.getByText("Linked jobs")).toBeInTheDocument();
    expect(screen.getByText("Away kit 2026")).toBeInTheDocument();
    expect(screen.getByText("Training tee restock")).toBeInTheDocument();
    expect(screen.getByText("Subtotal: RM 400.00")).toBeInTheDocument();
    expect(screen.getByText("Total: RM 420.50")).toBeInTheDocument();
    expect(screen.getByText("Notes: 50% deposit due before production")).toBeInTheDocument();
    expect(screen.getByText("Sent")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument();
  });
});
