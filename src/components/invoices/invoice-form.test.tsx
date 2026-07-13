import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InvoiceForm } from "./invoice-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() })
}));

const mockCustomers = [
  { id: "c1", name: "Aida Sports" },
  { id: "c2", name: "Bolt Athletics" }
];

const mockJobs = [
  { id: "j1", projectName: "Match Kit", status: "DRAFT" },
  { id: "j2", projectName: "Training Set", status: "DRAFT" }
];

describe("InvoiceForm", () => {
  it("renders auto-number, customer selector, job picker, and amount editor", () => {
    render(
      <InvoiceForm
        invoiceNumber="TP-0001"
        customers={mockCustomers}
        availableJobs={mockJobs}
      />
    );

    expect(screen.getByText("TP-0001")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("Match Kit")).toBeInTheDocument();
    expect(screen.getByText("Training Set")).toBeInTheDocument();
  });

  it("calculates subtotal and total when job amounts change", async () => {
    render(
      <InvoiceForm
        invoiceNumber="TP-0001"
        customers={mockCustomers}
        availableJobs={mockJobs}
      />
    );

    const job1Input = screen.getByDisplayValue("0");
    fireEvent.change(job1Input, { target: { value: "100" } });
    fireEvent.blur(job1Input);

    await waitFor(() => {
      expect(screen.getByText(/RM 100\.00/)).toBeInTheDocument();
    });
  });
});
