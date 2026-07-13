import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BinList } from "@/components/jobs/bin-list";

describe("BinList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads deleted jobs from the bin scope and renders restore and permanent delete actions", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: "job-1",
          projectName: "Deleted Job",
          createdAt: "2026-06-17T10:00:00.000Z",
          deletedAt: "2026-06-17T12:00:00.000Z"
        }
      ]
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<BinList />);

    expect(await screen.findByText("Deleted Job")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restore" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete permanently" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/jobs?scope=bin", { cache: "no-store" });
  });

  it("restores a job from the bin and removes it from the list", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: "job-1",
            projectName: "Deleted Job",
            createdAt: "2026-06-17T10:00:00.000Z",
            deletedAt: "2026-06-17T12:00:00.000Z"
          }
        ]
      })
      .mockResolvedValueOnce({
        ok: true
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<BinList />);

    expect(await screen.findByText("Deleted Job")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Restore" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/jobs/job-1/trash", { method: "PATCH" })
    );
    await waitFor(() => expect(screen.queryByText("Deleted Job")).not.toBeInTheDocument());
    expect(screen.getByText("Bin is empty")).toBeInTheDocument();
  });

  it("permanently deletes a job after confirmation", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: "job-1",
            projectName: "Deleted Job",
            createdAt: "2026-06-17T10:00:00.000Z",
            deletedAt: "2026-06-17T12:00:00.000Z"
          }
        ]
      })
      .mockResolvedValueOnce({
        ok: true
      });
    const confirmMock = vi.fn(() => true);
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("confirm", confirmMock);

    render(<BinList />);

    expect(await screen.findByText("Deleted Job")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete permanently" }));

    expect(confirmMock).toHaveBeenCalledWith("Delete permanently?");
    await waitFor(() =>
      expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/jobs/job-1/trash", { method: "POST" })
    );
    await waitFor(() => expect(screen.queryByText("Deleted Job")).not.toBeInTheDocument());
  });
});
