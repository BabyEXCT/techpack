import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createJobSchema } from "@/lib/jobs/job-schema";
import { notifyJobCreated } from "@/lib/telegram/notify";

async function ensureDemoUser() {
  // Temporary bootstrap for early versions: create a default owner user so foreign keys are valid.
  // Later: replace with real auth + session user id.
  await db.user.upsert({
    where: { id: "demo-user" },
    update: {},
    create: {
      id: "demo-user",
      email: "demo@local",
      password: "demo"
    }
  });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const scope = url.searchParams.get("scope");
    const jobs = await db.job.findMany({
      where: scope === "bin" ? { deletedAt: { not: null } } : { deletedAt: null },
      include: { customer: true },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(jobs, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = createJobSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((issue) => issue.message).join(", ") },
        { status: 400 }
      );
    }

    const input = parsed.data;

    await ensureDemoUser();

    const job = await db.job.create({
      data: {
        projectName: input.projectName,
        customerName: input.customerName,
        customerId: input.customerId ?? null,
        category: input.category,
        cuttingType: input.cuttingType,
        material: input.material,
        collarType: input.collarType,
        sourceMessage: input.sourceMessage,
        workflowStage: input.workflowStage,
        priority: input.priority,
        ownerId: "demo-user"
      }
    });

    notifyJobCreated(job.projectName, job.priority);
    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
