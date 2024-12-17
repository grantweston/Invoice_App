"use client";

import { useState, useEffect } from "react";
import { getJSON } from "../utils/requestHelpers";

// This custom hook fetches invoice data for a given invoice ID from the backend.
// It returns the invoice object and a loading state.
export function useInvoiceData(invoiceId: string) {
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInvoice() {
      // In a real scenario, this would be a valid endpoint returning invoice details.
      const data = await getJSON(`/api/invoice?id=${invoiceId}`);
      setInvoice(data);
      setLoading(false);
    }
    fetchInvoice();
  }, [invoiceId]);

  return { invoice, loading };
}