"use server";

import { Suspense } from "react";
import InvoicePreview from "@/app/components/InvoicePreview";
import LLMChatPanel from "@/app/components/LLMChatPanel";
import LoadingSpinner from "@/app/components/LoadingSpinner";

// This page displays a specific invoice and allows interacting with the LLM to refine its text.
// The invoice ID is extracted from the URL. In production, data would be fetched from a DB or APIs.
export default async function InvoicePage({ params }: { params: { id: string } }) {
  const { id } = params;

  // Mock invoice data
  const invoiceData = {
    invoiceId: id,
    docUrl: "https://docs.google.com/document/d/EXAMPLE_DOC_ID", // Example doc URL (not functional)
    client: "Client A",
    totalAmount: 1500,
    lineItems: [
      { description: "Tax Preparation (10 hours)", amount: 1000 },
      { description: "Consultation (5 hours)", amount: 500 }
    ]
  };

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <div>
        {/* Display invoice info */}
        <h1 className="text-xl font-bold mb-4">Invoice #{invoiceData.invoiceId}</h1>
        {/* Show invoice preview (Google Doc) */}
        <InvoicePreview docUrl={invoiceData.docUrl} />
        
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">Refine Invoice Text</h2>
          {/* Panel to interact with the LLM for refining invoice content */}
          <LLMChatPanel invoiceId={invoiceData.invoiceId} />
        </div>
      </div>
    </Suspense>
  );
}