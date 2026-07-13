import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CustomerProfile } from "@/components/customers/customer-profile";

describe("CustomerProfile", () => {
  it("renders the customer profile fields and summary metrics", () => {
    render(
      <CustomerProfile
        customer={{
          id: "customer-1",
          name: "Aida Sports",
          companyName: "Aida Sportswear",
          phone: "012-3332221",
          email: "hello@aida.test",
          address: "Lot 3, Shah Alam",
          preferredPaymentMethod: "Maybank transfer",
          deliveryNote: "Leave with guard house",
          notes: "Prefers WhatsApp updates"
        }}
        jobCount={4}
        invoiceCount={3}
        outstandingBalance={520.4}
      />
    );

    expect(screen.getByRole("heading", { name: "Aida Sports" })).toBeInTheDocument();
    expect(screen.getAllByText("Aida Sportswear").length).toBeGreaterThan(0);
    expect(screen.getByText("012-3332221")).toBeInTheDocument();
    expect(screen.getByText("hello@aida.test")).toBeInTheDocument();
    expect(screen.getByText("Lot 3, Shah Alam")).toBeInTheDocument();
    expect(screen.getByText("Maybank transfer")).toBeInTheDocument();
    expect(screen.getByText("Leave with guard house")).toBeInTheDocument();
    expect(screen.getByText("Prefers WhatsApp updates")).toBeInTheDocument();
    expect(screen.getByText("4 linked jobs")).toBeInTheDocument();
    expect(screen.getByText("3 invoices")).toBeInTheDocument();
    expect(screen.getByText("RM 520.40")).toBeInTheDocument();
  });

  it("falls back to not provided labels for optional profile details", () => {
    render(
      <CustomerProfile
        customer={{
          id: "customer-2",
          name: "Bintang FC"
        }}
        jobCount={0}
        invoiceCount={0}
        outstandingBalance={0}
      />
    );

    expect(screen.getAllByText("Not provided").length).toBeGreaterThan(0);
    expect(screen.getByText("RM 0.00")).toBeInTheDocument();
  });
});
