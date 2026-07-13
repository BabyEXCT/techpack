import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, beforeEach, expect, it, vi } from "vitest";
import { ReviewJobClient } from "@/components/jobs/review-job-client";
import { getLocalJob, upsertLocalJob } from "@/lib/jobs/local-jobs";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : ""} {...props}>
      {children}
    </a>
  )
}));

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />
}));

vi.mock("@/lib/jobs/local-jobs", () => ({
  getLocalJob: vi.fn(),
  upsertLocalJob: vi.fn()
}));

describe("ReviewJobClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => null
      })
    );

    vi.mocked(getLocalJob).mockReturnValue({
      id: "job-1",
      projectName: "Kraxtom FC",
      sourceMessage: "",
      brandName: "Kraxtom",
      category: "Sublimation",
      sizeLabel: "XS-5XL",
      dateLabel: "2026-06-16",
      cuttingType: "Raglan",
      material: "Mini eyelet",
      collarType: "Retro",
      productionNotes: "",
      placementNote: "",
      roster: [],
      sizeTotals: {},
      mockupFiles: [],
      logoFiles: [],
      createdAt: "2026-06-16T00:00:00.000Z"
    });
  });

  it("uses a native date input and keeps dateLabel unchanged in the PATCH payload", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true })
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<ReviewJobClient jobId="job-1" />);

    const dateInput = await screen.findByLabelText("Date");
    expect(dateInput).toHaveAttribute("type", "date");

    fireEvent.change(dateInput, { target: { value: "2026-06-19" } });
    fireEvent.click(screen.getByRole("button", { name: "Save review changes" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    expect(upsertLocalJob).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "job-1",
        dateLabel: "2026-06-19"
      })
    );

    const patchOptions = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(patchOptions).toEqual(
      expect.objectContaining({
        method: "PATCH"
      })
    );
    expect(JSON.parse(String(patchOptions.body))).toEqual(
      expect.objectContaining({
        dateLabel: "2026-06-19"
      })
    );
  });

  it("renders parsed item sections from the job draft", async () => {
    vi.mocked(getLocalJob).mockReturnValue({
      id: "job-1",
      projectName: "Mixed Job",
      sourceMessage: "",
      brandName: "Kraxtom",
      category: "Sublimation",
      sizeLabel: "XS-5XL",
      dateLabel: "2026-06-16",
      cuttingType: "Raglan",
      material: "Mini eyelet",
      collarType: "Retro",
      productionNotes: "",
      placementNote: "",
      items: [
        {
          name: "Muslimah",
          cuttingType: "Muslimah",
          collarType: "",
          material: "",
          roster: [{ rowNumber: 1, name: "ALYAA", number: "13", size: "S", qty: 1, remarks: "" }],
          sizeTotals: { S: 1 },
          mockupFiles: [],
          artworkCutPieces: [],
          colorConfirmationFiles: [],
          sectionFiles: [
            {
              name: "muslimah-front.png",
              dataUrl: "data:image/png;base64,AAA",
              detectedLabel: "mockup",
              chosenLabel: "mockup",
              mockupVariant: "front"
            },
            {
              name: "muslimah-sleeve.png",
              dataUrl: "data:image/png;base64,BBB",
              detectedLabel: "cutpiece",
              chosenLabel: "cutpiece"
            },
            {
              name: "muslimah-color.png",
              dataUrl: "data:image/png;base64,CCC",
              detectedLabel: "colorcode",
              chosenLabel: "colorcode"
            }
          ]
        },
        {
          name: "Polo",
          cuttingType: "",
          collarType: "Polo",
          material: "Mini eyelet",
          roster: [{ rowNumber: 2, name: "AIMI", number: "21", size: "M", qty: 1, remarks: "" }],
          sizeTotals: { M: 1 },
          mockupFiles: [],
          artworkCutPieces: [],
          colorConfirmationFiles: [],
          sectionFiles: []
        }
      ],
      roster: [
        { rowNumber: 1, name: "ALYAA", number: "13", size: "S", qty: 1, remarks: "" },
        { rowNumber: 2, name: "AIMI", number: "21", size: "M", qty: 1, remarks: "" }
      ],
      sizeTotals: { S: 1, M: 1 },
      mockupFiles: [],
      logoFiles: [],
      createdAt: "2026-06-16T00:00:00.000Z"
    });

    render(<ReviewJobClient jobId="job-1" />);

    expect(await screen.findByRole("heading", { name: "Order items" })).toBeInTheDocument();
    expect(
      screen.getByText("Section mockups override the shared mockup. Artwork cut pieces and color confirmation are section-only.")
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Muslimah" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Polo" })).toBeInTheDocument();
    expect(screen.getAllByText("Upload section files")).toHaveLength(2);
    expect(screen.getAllByText("Upload mockup, cut pieces, and color code images together for this section.")).toHaveLength(2);
    expect(screen.getByText("muslimah-front.png")).toBeInTheDocument();
    expect(screen.getByText("muslimah-sleeve.png")).toBeInTheDocument();
    expect(screen.getByText("muslimah-color.png")).toBeInTheDocument();
    expect(screen.getByText("Detected Mockup")).toBeInTheDocument();
    expect(screen.getByText("Detected Cut Pieces")).toBeInTheDocument();
    expect(screen.getByText("Detected Color Code")).toBeInTheDocument();
    expect(screen.getByText("No section files uploaded for this section yet.")).toBeInTheDocument();
    expect(screen.getByText("ALYAA - 13 (S)")).toBeInTheDocument();
    expect(screen.getByText("AIMI - 21 (M)")).toBeInTheDocument();
  });

  it("renders one upload group per section with detected labels and editable chosen label selectors", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true })
      });
    vi.stubGlobal("fetch", fetchMock);

    vi.mocked(getLocalJob).mockReturnValue({
      id: "job-1",
      projectName: "Mixed Job",
      sourceMessage: "",
      brandName: "Kraxtom",
      category: "Sublimation",
      sizeLabel: "XS-5XL",
      dateLabel: "2026-06-16",
      cuttingType: "Raglan",
      material: "Mini eyelet",
      collarType: "Retro",
      productionNotes: "",
      placementNote: "",
      items: [
        {
          name: "Polo",
          cuttingType: "",
          collarType: "Polo",
          material: "Mini eyelet",
          roster: [{ rowNumber: 1, name: "AIMI", number: "21", size: "M", qty: 1, remarks: "" }],
          sizeTotals: { M: 1 },
          mockupFiles: [],
          artworkCutPieces: [],
          colorConfirmationFiles: [],
          sectionFiles: [
            {
              name: "polo-mockup-front.jpg",
              dataUrl: "data:image/png;base64,AAA",
              detectedLabel: "mockup",
              chosenLabel: "mockup",
              mockupVariant: "front"
            },
            {
              name: "polo-colorcode.jpg",
              dataUrl: "data:image/png;base64,BBB",
              detectedLabel: "colorcode",
              chosenLabel: "colorcode"
            }
          ]
        },
        {
          name: "Muslimah",
          cuttingType: "Muslimah",
          collarType: "",
          material: "",
          roster: [{ rowNumber: 2, name: "ALYAA", number: "13", size: "S", qty: 1, remarks: "" }],
          sizeTotals: { S: 1 },
          mockupFiles: [],
          artworkCutPieces: [],
          colorConfirmationFiles: [],
          sectionFiles: []
        }
      ],
      roster: [
        { rowNumber: 1, name: "AIMI", number: "21", size: "M", qty: 1, remarks: "" },
        { rowNumber: 2, name: "ALYAA", number: "13", size: "S", qty: 1, remarks: "" }
      ],
      sizeTotals: { M: 1, S: 1 },
      mockupFiles: [],
      logoFiles: [],
      createdAt: "2026-06-16T00:00:00.000Z"
    });

    render(<ReviewJobClient jobId="job-1" />);

    expect(await screen.findByRole("heading", { name: "Order items" })).toBeInTheDocument();
    expect(screen.getAllByText("Upload section files")).toHaveLength(2);
    expect(screen.getByText("polo-mockup-front.jpg")).toBeInTheDocument();
    expect(screen.getByText("polo-colorcode.jpg")).toBeInTheDocument();
    expect(screen.getByText("Detected Mockup")).toBeInTheDocument();
    expect(screen.getByText("Detected Color Code")).toBeInTheDocument();
    expect(screen.getByText("Front mockup")).toBeInTheDocument();

    const selects = screen.getAllByRole("combobox", { name: "Chosen label" });
    expect(selects).toHaveLength(2);
    expect(selects[0]).toHaveDisplayValue("Mockup");
    expect(selects[1]).toHaveDisplayValue("Color Code");

    fireEvent.change(selects[1], { target: { value: "cutpiece" } });
    expect(selects[1]).toHaveDisplayValue("Cut Pieces");

    fireEvent.click(screen.getByRole("button", { name: "Save review changes" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    expect(upsertLocalJob).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            name: "Polo",
            sectionFiles: [
              expect.objectContaining({
                name: "polo-mockup-front.jpg",
                chosenLabel: "mockup"
              }),
              expect.objectContaining({
                name: "polo-colorcode.jpg",
                chosenLabel: "cutpiece"
              })
            ]
          }),
          expect.objectContaining({
            name: "Muslimah",
            sectionFiles: []
          })
        ]
      })
    );

    const patchOptions = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(JSON.parse(String(patchOptions.body))).toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            name: "Polo",
            sectionFiles: [
              expect.objectContaining({
                name: "polo-mockup-front.jpg",
                chosenLabel: "mockup"
              }),
              expect.objectContaining({
                name: "polo-colorcode.jpg",
                chosenLabel: "cutpiece"
              })
            ]
          }),
          expect.objectContaining({
            name: "Muslimah",
            sectionFiles: []
          })
        ]
      })
    );
  });
});
