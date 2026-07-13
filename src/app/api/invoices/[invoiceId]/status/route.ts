import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isValidTransition } from "@/lib/invoices/status-transitions";
import { z } from "zod";
import { notifyPaymentStatus } from "@/lib/telegram/notify";

const statusUpdateSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE"])
});

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ invoiceId: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  const { invoiceId } = await params;

  try {
    const json = await request.json();
    const parsed = statusUpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, paymentStatus: true }
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (!isValidTransition(invoice.paymentStatus, parsed.data.status)) {
      return NextResponse.json(
        { error: `Invalid status transition from ${invoice.paymentStatus} to ${parsed.data.status}` },
        { status: 400 }
      );
    }

    const updated = await db.invoice.update({
      where: { id: invoiceId },
      data: { paymentStatus: parsed.data.status },
      select: { id: true, paymentStatus: true }
    });

    notifyPaymentStatus(invoiceId, parsed.data.status);

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
