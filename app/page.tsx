"use server";

import { Suspense } from "react";
import WIPTable from "./components/WIPTable";
import LoadingSpinner from "./components/LoadingSpinner";

// We will use a client component for the form actions (Begin/End Work Session buttons)
// to call the /api/dailyReport POST route. This requires a client-side action.

import { useState } from "react";
import { useRouter } from 'next/navigation';

// Note: We are mixing "use server" at top-level and a client component inside.
// The server component returns PageClient as children inside Suspense.
// PageClient is defined below with "use client".

export default async function Page() {
  // Mock WIP entries for demonstration. In a real app, we'd fetch from DB.
  const wipEntries = [
    { id: 1, client: "Client A", project: "Project Alpha", hours: 1.25, description: "Tax preparation" },
    { id: 2, client: "Client B", project: "Project Beta", hours: 0.5, description: "Audit review" }
  ];

  // Return the page wrapped in a Suspense boundary, rendering PageClient as a client component.
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <PageClient wipEntries={wipEntries} />
    </Suspense>
  );
}

/**
 * PageClient:
 * A client component that renders the WIP dashboard and "Begin Work Session" and "End Work Session" buttons.
 * When "End Work Session" is clicked, it triggers a POST to /api/dailyReport to produce a fresh daily aggregation,
 * then navigates to /daily-report to show the new report.
 */
function PageClient({ wipEntries }: { wipEntries: any[] }) {
  "use client";
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const endWorkSession = async () => {
    setLoading(true);
    // POST to /api/dailyReport to force re-aggregation
    const res = await fetch('/api/dailyReport', { method: 'POST' });
    if (!res.ok) {
      alert("Failed to generate daily report");
      setLoading(false);
      return;
    }
    // On success, navigate to the daily-report page to view aggregated data.
    router.push('/daily-report');
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Work In Progress (WIP) Dashboard</h1>

      <div className="mb-4 flex space-x-2">
        {/* Begin Work Session is just a placeholder alert right now */}
        <button
          type="button"
          className="bg-green-600 text-white px-3 py-1 rounded text-sm"
          onClick={() => alert("Work session started (placeholder)")}
        >
          Begin Work Session
        </button>

        {/* End Work Session triggers the daily aggregation */}
        <button
          type="button"
          className="bg-red-600 text-white px-3 py-1 rounded text-sm"
          onClick={endWorkSession}
          disabled={loading}
        >
          {loading ? "Generating Report..." : "End Work Session"}
        </button>
      </div>

      {/* Display the current WIP entries in a table */}
      <WIPTable initialData={wipEntries} />
    </div>
  );
}