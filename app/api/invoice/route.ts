"use server";

import { NextRequest, NextResponse } from "next/server";
import { getInvoice, createInvoice, updateInvoice } from "@/src/backend/services/invoiceService";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing invoice id" }, { status: 400 });
    }

    const invoice = await getInvoice(id);
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(invoice, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json({ error: "Failed to fetch invoice" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    if (!data.clientId || data.totalAmount === undefined) {
      return NextResponse.json({ error: "Missing required invoice fields" }, { status: 400 });
    }

    const newInvoice = await createInvoice(data);
    return NextResponse.json(newInvoice, { status: 201 });
  } catch (error: any) {
    console.error("Error creating invoice:", error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const data = await req.json();
    if (!data.id) {
      return NextResponse.json({ error: "Missing invoice id for update" }, { status: 400 });
    }

    const updated = await updateInvoice(data);
    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    console.error("Error updating invoice:", error);
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
  }
}