import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { customerSchema } from "@/lib/customers/customer-schema";
import { notifyNewCustomer } from "@/lib/telegram/notify";

export async function GET() {
  try {
    const customers = await db.customer.findMany({
      orderBy: { updatedAt: "desc" },
      include: { jobs: true, invoices: true }
    });

    return NextResponse.json(customers, { status: 200 });
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
    const parsed = customerSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const customer = await db.customer.create({
      data: parsed.data
    });

    notifyNewCustomer(customer.name);

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
