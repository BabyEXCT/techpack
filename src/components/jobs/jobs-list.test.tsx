import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JobsList } from "@/components/jobs/jobs-list";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : ""} {...props}>
      {children}
    </a>
  )
}));

describe("JobsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads active jobs from the API and renders view, edit, and delete actions", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: "job-1",
          projectName: "Active Job",
          createdAt: "2026-06-17T10:00:00.000Z",
          workflowStage: "DESIGN",
          priority: "URGENT",
          customer: {
            id: "customer-1",
            name: "Aida Sports"
          }
        }
      ]
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<JobsList />);

    expect(await screen.findByText("Active Job")).toBeInTheDocument();
    expect(screen.getByText("Design")).toBeInTheDocument();
    expect(screen.getByText("Urgent")).toBeInTheDocument();
    expect(screen.getByText("Aida Sports")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute("href", "/jobs/job-1/review");
    expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute("href", "/jobs/job-1/review");
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/jobs", { cache: "no-store" });
  });

  it("moves a job to the bin and removes it from the list", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: "job-1",
            projectName: "Active Job",
            createdAt: "2026-06-17T10:00:00.000Z",
            workflowStage: "DESIGN",
            priority: "URGENT",
            customer: {
              id: "customer-1",
              name: "Aida Sports"
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        ok: true
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<JobsList />);

    expect(await screen.findByText("Active Job")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/jobs/job-1/trash", { method: "DELETE" })
    );
    await waitFor(() => expect(screen.queryByText("Active Job")).not.toBeInTheDocument());
    expect(screen.getByText("No jobs yet")).toBeInTheDocument();
  });
});
