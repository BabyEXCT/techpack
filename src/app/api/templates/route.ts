import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  body: z.string().min(1)
});

export async function GET() {
  try {
    const templates = await db.messageTemplate.findMany({ orderBy: { updatedAt: "desc" } });
    return NextResponse.json(templates, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const tpl = await db.messageTemplate.create({ data: parsed.data });
    return NextResponse.json(tpl, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
