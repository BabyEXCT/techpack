import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { jobId } = await params;

  try {
    await db.job.update({
      where: { id: jobId },
      data: { deletedAt: new Date() }
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PATCH(_request: Request, { params }: RouteContext) {
  const { jobId } = await params;

  try {
    await db.job.update({
      where: { id: jobId },
      data: { deletedAt: null }
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(_request: Request, { params }: RouteContext) {
  const { jobId } = await params;

  try {
    await db.job.delete({
      where: { id: jobId }
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
