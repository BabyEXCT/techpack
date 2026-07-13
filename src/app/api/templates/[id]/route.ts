import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  body: z.string().min(1)
});

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const tpl = await db.messageTemplate.findUnique({ where: { id } });
  if (!tpl) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(tpl, { status: 200 });
}

export async function PUT(request: Request, { params }: Ctx) {
  const { id } = await params;
  const json = await request.json();
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const tpl = await db.messageTemplate.update({ where: { id }, data: parsed.data });
  return NextResponse.json(tpl, { status: 200 });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  await db.messageTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true }, { status: 200 });
}
