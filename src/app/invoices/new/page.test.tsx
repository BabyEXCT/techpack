/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  customerFindMany: vi.fn(),
  jobFindMany: vi.fn(),
  invoiceCounterFindUnique: vi.fn(),
  invoiceCounterUpsert: vi.fn()
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() })
}));

vi.mock("@/lib/db", () => ({
  db: {
    customer: { findMany: dbMocks.customerFindMany },
    job: { findMany: dbMocks.jobFindMany },
    $transaction: vi.fn((cb: any) =>
      cb({
        invoiceCounter: {
          upsert: dbMocks.invoiceCounterUpsert
        }
      })
    )
  }
}));

import NewInvoicePage from "./page";

describe("NewInvoicePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.customerFindMany.mockResolvedValue([
      { id: "c1", name: "Aida Sports" }
    ]);
    dbMocks.jobFindMany.mockResolvedValue([
      { id: "j1", projectName: "Match Kit", status: "DRAFT" }
    ]);
    dbMocks.invoiceCounterUpsert.mockResolvedValue({ id: "counter", prefix: "TP-", next: 2 });
  });

  it("renders create invoice form with auto-number TP-0001", async () => {
    render(await NewInvoicePage());

    expect(screen.getByText("TP-0001")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("Match Kit")).toBeInTheDocument();
  });
});
