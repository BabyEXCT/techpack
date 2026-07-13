import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerForm } from "./customer-form";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock
  })
}));

describe("CustomerForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a customer and redirects to the detail page", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "customer-1" })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CustomerForm />);

    fireEvent.change(screen.getByLabelText("Customer name"), {
      target: { value: "Aida Sports" }
    });
    fireEvent.change(screen.getByLabelText("Phone"), {
      target: { value: "012-3332221" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save customer" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/customers/customer-1"));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/customers",
      expect.objectContaining({ method: "POST" })
    );
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });
});
