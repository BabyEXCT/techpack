import { NextResponse } from "next/server";
import { Prisma, InvoicePaymentStatus as PrismaInvoicePaymentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { invoiceSchema } from "@/lib/invoices/invoice-schema";
import { generateInvoiceNumber } from "@/lib/invoices/auto-number";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    const where: Prisma.InvoiceWhereInput = statusFilter
      ? { paymentStatus: statusFilter as PrismaInvoicePaymentStatus }
      : {};

    const invoices = await db.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { customer: true, jobs: true }
    });

    return NextResponse.json(invoices, { status: 200 });
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
    const parsed = invoiceSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const invoiceNumber = parsed.data.invoiceNumber || (await generateInvoiceNumber());

    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        customerId: parsed.data.customerId,
        subtotal: parsed.data.subtotal,
        notes: parsed.data.notes,
        total: parsed.data.total,
        paymentStatus: parsed.data.paymentStatus ?? "DRAFT",
        jobs: {
          connect: parsed.data.jobIds.map((id) => ({ id }))
        }
      },
      include: { customer: true, jobs: true }
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
