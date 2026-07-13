import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { customerSchema } from "@/lib/customers/customer-schema";

type RouteContext = {
  params: Promise<{ customerId: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { customerId } = await params;

  try {
    const customer = await db.customer.findUnique({
      where: { id: customerId },
      include: { jobs: true, invoices: true }
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json(customer, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { customerId } = await params;

  try {
    const json = await request.json();
    const parsed = customerSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const customer = await db.customer.update({
      where: { id: customerId },
      data: parsed.data
    });

    return NextResponse.json(customer, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
