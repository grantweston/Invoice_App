"use server";

import { Suspense } from "react";
import LoadingSpinner from "@/app/components/LoadingSpinner";

// This page displays the daily aggregated WIP report, showing total hours and descriptions.
// In a real implementation, data would come from a server action or DB query.
export default async function DailyReportPage() {
  // Mock data representing aggregated daily work, grouped by client and project
  const dailyData = {
    "Client A": {
      "Project Alpha": { total_time_hours: 10.5, description: "Tax preparation and bookkeeping" },
      "Project Gamma": { total_time_hours: 3, description: "Quarterly review" }
    },
    "Client B": {
      "Project Beta": { total_time_hours: 2, description: "Audit review" }
    }
  };

  return (
    // Using Suspense and a loading spinner in case of async fetching in a real scenario
    <Suspense fallback={<LoadingSpinner />}>
      <div>
        <h1 className="text-xl font-bold mb-4">Daily WIP Report</h1>
        {/* Displaying the JSON data for now, but could be formatted more nicely in production */}
        <pre className="bg-gray-100 p-4 rounded"><code>{JSON.stringify(dailyData, null, 2)}</code></pre>
      </div>
    </Suspense>
  );
}