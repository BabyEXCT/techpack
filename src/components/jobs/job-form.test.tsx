import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, beforeEach, afterEach, expect, it, vi } from "vitest";
import { JobForm } from "@/components/jobs/job-form";
import { getLocalJob, upsertLocalJob } from "@/lib/jobs/local-jobs";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock
  })
}));

vi.mock("@/lib/jobs/local-jobs", () => ({
  upsertLocalJob: vi.fn(),
  getLocalJob: vi.fn()
}));

describe("JobForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getLocalJob).mockReturnValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("defaults the date field to today in local YYYY-MM-DD format and uses a native date input", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 17, 9, 30, 0));

    render(<JobForm />);

    const dateInput = screen.getByLabelText("Date");
    expect(dateInput).toHaveAttribute("type", "date");
    expect(dateInput).toHaveValue("2026-06-17");
  });

  it("keeps dateLabel unchanged in the saved draft payload", async () => {
    const fetchMock = vi.fn(async (input: string) => {
      if (input === "/api/customers") {
        return {
          ok: true,
          json: async () => []
        };
      }

      return {
        ok: true,
        json: async () => ({ id: "job-123" })
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<JobForm />);

    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "Kraxtom FC" }
    });
    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: "2026-06-21" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save draft job" }));

    await waitFor(() => expect(upsertLocalJob).toHaveBeenCalledTimes(1));

    expect(upsertLocalJob).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "job-123",
        projectName: "Kraxtom FC",
        dateLabel: "2026-06-21"
      })
    );
    expect(fetchMock).toHaveBeenCalledWith("/api/jobs", expect.objectContaining({ method: "POST" }));
    expect(pushMock).toHaveBeenCalledWith("/jobs/job-123/review");
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("shows a customer selector and sends the selected customer with the job", async () => {
    const fetchMock = vi.fn(async (input: string) => {
      if (input === "/api/customers") {
        return {
          ok: true,
          json: async () => [{ id: "customer-1", name: "Aida Sports" }]
        };
      }

      return {
        ok: true,
        json: async () => ({ id: "job-456" })
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<JobForm />);

    expect(await screen.findByRole("option", { name: "Aida Sports" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create new customer" })).toHaveAttribute(
      "href",
      "/customers/new"
    );

    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "Kraxtom FC" }
    });
    fireEvent.change(screen.getByLabelText("Customer"), {
      target: { value: "customer-1" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save draft job" }));

    await waitFor(() => expect(upsertLocalJob).toHaveBeenCalledTimes(1));

    const postCall = fetchMock.mock.calls.find(([url]) => url === "/api/jobs");
    expect(postCall).toBeTruthy();
    expect(JSON.parse(String(postCall?.[1]?.body))).toMatchObject({
      customerId: "customer-1",
      customerName: "Aida Sports"
    });
  });

  it("loads an existing job draft and updates the same job in edit mode", async () => {
    vi.mocked(getLocalJob).mockReturnValue({
      id: "job-123",
      projectName: "Kraxtom FC",
      brandName: "Kraxtom",
      customerName: "Aida Sports",
      category: "Sublimation",
      sizeLabel: "XS-3XL",
      dateLabel: "2026-06-19",
      cuttingType: "Raglan",
      material: "Mini eyelet",
      collarType: "Retro",
      sourceMessage: "Old message",
      items: [],
      roster: [],
      sizeTotals: {},
      mockupFiles: [],
      logoFiles: [],
      createdAt: "2026-06-19T00:00:00.000Z"
    });

    const fetchMock = vi.fn(async (input: string) => {
      if (input === "/api/customers") {
        return {
          ok: true,
          json: async () => [{ id: "customer-1", name: "Aida Sports" }]
        };
      }

      return {
        ok: true,
        json: async () => ({ id: "job-123" })
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<JobForm editJobId="job-123" />);

    await waitFor(() => expect(screen.getByDisplayValue("Kraxtom FC")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Update job draft" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "Kraxtom FC Updated" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Update job draft" }));

    await waitFor(() => expect(upsertLocalJob).toHaveBeenCalledTimes(1));

    const patchCall = fetchMock.mock.calls.find(([url]) => url === "/api/jobs/job-123");
    expect(patchCall).toBeTruthy();
    expect(patchCall?.[1]).toMatchObject({ method: "PATCH" });
    expect(JSON.parse(String(patchCall?.[1]?.body))).toMatchObject({
      projectName: "Kraxtom FC Updated"
    });
    expect(pushMock).toHaveBeenCalledWith("/jobs/job-123/review");
  });
});
