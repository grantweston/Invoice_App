"use server";

import { NextRequest, NextResponse } from "next/server";
import { markInvoiceAsPaid } from "@/src/backend/services/invoiceService";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { invoiceId } = data;
    if (!invoiceId) {
      return NextResponse.json({ error: "Missing invoiceId" }, { status: 400 });
    }

    const result = await markInvoiceAsPaid(invoiceId);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("Error marking invoice as paid:", error);
    return NextResponse.json({ error: "Failed to mark invoice as paid" }, { status: 500 });
  }
}