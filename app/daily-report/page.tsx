"use server";

import { Suspense } from "react";
import LoadingSpinner from "@/app/components/LoadingSpinner";

/**
 * DailyReportPage:
 * A server component that fetches the daily aggregated WIP report from /api/dailyReport
 * and displays it in a <pre> block.
 * Uses a server action fetchDailyReport() to call the API endpoint.
 */
export default async function DailyReportPage() {
  const report = await fetchDailyReport();
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <div>
        <h1 className="text-xl font-bold mb-4">Daily WIP Report</h1>
        {/* Display the aggregated data as JSON */}
        <pre className="bg-gray-100 p-4 rounded"><code>{JSON.stringify(report, null, 2)}</code></pre>
      </div>
    </Suspense>
  );
}

/**
 * fetchDailyReport():
 * Calls the /api/dailyReport endpoint to get today's aggregation.
 * Uses no-store caching to ensure fresh data every time.
 */
async function fetchDailyReport() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/dailyReport`, {
    cache: 'no-store'
  });
  if (!res.ok) {
    console.error("Failed to fetch daily report");
    return {};
  }
  return res.json();
}