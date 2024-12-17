"use server";

import { Suspense } from "react";
import LoadingSpinner from "./components/LoadingSpinner";
import WIPTable from "./components/WIPTable";
// Import the client component
import PageClient from "./page-client";

export default async function Page() {
  // Mock WIP entries for demonstration. In a real app, we'd fetch from DB.
  const wipEntries = [
    { id: 1, client: "Client A", project: "Project Alpha", hours: 1.25, description: "Tax preparation" },
    { id: 2, client: "Client B", project: "Project Beta", hours: 0.5, description: "Audit review" }
  ];

  // The server component just returns the layout and renders the client component inside Suspense.
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <PageClient wipEntries={wipEntries} />
    </Suspense>
  );
}