import { POST as generatePdf } from "../generate/route";

type GeneratedFile = {
  key: string;
  name: string;
  mimeType: string;
  base64: string;
};

function decodeBase64(base64: string) {
  return Buffer.from(base64, "base64");
}

async function buildPreviewResponse(request: Request, params: Promise<{ jobId: string }>) {
  const generationResponse = await generatePdf(request, { params });
  const body = await generationResponse.json().catch(() => null);

  if (!generationResponse.ok) {
    return Response.json(body ?? { error: "Preview generation failed" }, { status: generationResponse.status });
  }

  const combined = ((body as { files?: GeneratedFile[] } | null)?.files ?? []).find((file) => file.key === "combined");
  if (!combined) {
    return Response.json({ error: "Combined PDF not found" }, { status: 404 });
  }

  return new Response(decodeBase64(combined.base64), {
    status: 200,
    headers: {
      "content-type": combined.mimeType || "application/pdf",
      "content-disposition": `inline; filename="${combined.name}"`
    }
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  return buildPreviewResponse(request, params);
}

export async function POST(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  return buildPreviewResponse(request, params);
}
