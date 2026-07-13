import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SummaryCards } from "@/components/dashboard/summary-cards";

describe("SummaryCards", () => {
  it("renders all dashboard metrics with icon and premium styling", () => {
    render(
      <SummaryCards
        activeJobs={12}
        waitingApproval={3}
        inProduction={4}
        unpaidInvoices={6}
        outstandingBalance={2450.5}
        totalCustomers={18}
      />
    );

    expect(screen.getByText("Active jobs")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Waiting approval")).toBeInTheDocument();
    expect(screen.getByText("In production")).toBeInTheDocument();
    expect(screen.getByText("Unpaid invoices")).toBeInTheDocument();
    expect(screen.getByText("Outstanding balance")).toBeInTheDocument();
    expect(screen.getByText("RM 2450.50")).toBeInTheDocument();
    expect(screen.getByText("Customers")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();

    expect(screen.getByText("Active jobs").closest('[class*="tile-"]')).toHaveClass(
      "tile-hoverable"
    );
  });
});
