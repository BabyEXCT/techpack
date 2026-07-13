import { NextResponse } from "next/server";
import { saveJobFiles, type UploadFileKind } from "@/lib/jobs/job-file-service";

function isUploadKind(value: string): value is UploadFileKind {
  return value === "MOCKUP" || value === "LOGO" || value === "ARTWORK";
}

export async function POST(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;

  try {
    const form = await request.formData();
    const kind = String(form.get("kind") ?? "");
    const files = form
      .getAll("files")
      .filter((value): value is File => typeof File !== "undefined" && value instanceof File);

    if (!isUploadKind(kind)) {
      return NextResponse.json({ error: "Invalid file kind" }, { status: 400 });
    }

    if (!files.length) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    await saveJobFiles(jobId, kind, files);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown upload error" },
      { status: 500 }
    );
  }
}

