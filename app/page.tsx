"use server";

import { Suspense } from "react";
import WIPTable from "./components/WIPTable";
import LoadingSpinner from "./components/LoadingSpinner";
import { revalidatePath } from 'next/cache';

async function endWorkSession() {
  // When the user ends their work session, we trigger a daily report generation.
  // In a real scenario, we would call a server action or API endpoint to generate the report.
  // Here, we just simulate a server call and revalidate the page or navigate to the daily report page.

  // For demonstration, let's just revalidate this page (no real action).
  await revalidatePath('/daily-report');
}

// This page serves as the main dashboard, displaying current WIP entries.
// Now includes buttons to "Begin Work Session" and "End Work Session".
// Begin Work Session might reset some state or just be a placeholder for now.
// End Work Session triggers the daily report generation logic.
export default async function Page() {
  // Mock WIP entries for demonstration
  const wipEntries = [
    { id: 1, client: "Client A", project: "Project Alpha", hours: 1.25, description: "Tax preparation" },
    { id: 2, client: "Client B", project: "Project Beta", hours: 0.5, description: "Audit review" }
  ];
  
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <div className="p-4">

        <h1 className="text-xl font-bold mb-4">Work In Progress (WIP) Dashboard</h1>

        {/* Buttons for starting and ending a work session */}
        <div className="mb-4 flex space-x-2">
          <form action="#" method="post" onSubmit={(e) => e.preventDefault()}>
            <button
              type="submit"
              className="bg-green-600 text-white px-3 py-1 rounded text-sm"
            >
              Begin Work Session
            </button>
          </form>

          <form action="#" method="post" onSubmit={async (e) => {
            e.preventDefault();
            await endWorkSession();
            // In a real scenario, navigate to /daily-report or show a notification.
          }}>
            <button
              type="submit"
              className="bg-red-600 text-white px-3 py-1 rounded text-sm"
            >
              End Work Session
            </button>
          </form>
        </div>

        {/* Displaying the WIP entries in a table component */}
        <WIPTable initialData={wipEntries} />
      </div>
    </Suspense>
  );
}