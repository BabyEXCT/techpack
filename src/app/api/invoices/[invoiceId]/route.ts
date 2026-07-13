import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoiceSchema } from "@/lib/invoices/invoice-schema";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ invoiceId: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { invoiceId } = await params;

  try {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true, jobs: true }
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(invoice, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { invoiceId } = await params;

  try {
    await db.invoice.delete({ where: { id: invoiceId } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { invoiceId } = await params;

  try {
    const json = await request.json();
    const parsed = invoiceSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const invoice = await db.invoice.update({
      where: { id: invoiceId },
      data: {
        invoiceNumber: parsed.data.invoiceNumber,
        customerId: parsed.data.customerId,
        subtotal: parsed.data.subtotal,
        notes: parsed.data.notes,
        total: parsed.data.total,
        paymentStatus: parsed.data.paymentStatus,
        jobs: {
          set: parsed.data.jobIds.map((id) => ({ id }))
        }
      },
      include: { customer: true, jobs: true }
    });

    return NextResponse.json(invoice, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
