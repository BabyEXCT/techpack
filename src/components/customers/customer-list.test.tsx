import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CustomerList } from "@/components/customers/customer-list";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : ""} {...props}>
      {children}
    </a>
  )
}));

describe("CustomerList", () => {
  it("renders stacked customer cards with linked activity and outstanding balance", () => {
    render(
      <CustomerList
        customers={[
          {
            id: "customer-1",
            name: "Aida Sports",
            companyName: "Aida Sportswear",
            phone: "012-3332221",
            outstandingBalance: 320.5,
            jobCount: 3,
            invoiceCount: 2
          },
          {
            id: "customer-2",
            name: "Bintang FC",
            outstandingBalance: 0,
            jobCount: 1,
            invoiceCount: 0
          }
        ]}
      />
    );

    expect(screen.getByRole("link", { name: "Aida Sports" })).toHaveAttribute("href", "/customers/customer-1");
    expect(screen.getByText("Aida Sportswear")).toBeInTheDocument();
    expect(screen.getByText("3 jobs")).toBeInTheDocument();
    expect(screen.getByText("2 invoices")).toBeInTheDocument();
    expect(screen.getByText("RM 320.50")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bintang FC" })).toHaveAttribute("href", "/customers/customer-2");
    expect(screen.getByText("No contact yet")).toBeInTheDocument();
  });

  it("shows an empty state when there are no customers to display", () => {
    render(<CustomerList customers={[]} />);

    expect(screen.getByText("No customers yet")).toBeInTheDocument();
    expect(screen.getByText("Create a customer to track repeat orders, jobs, and invoices.")).toBeInTheDocument();
  });
});
