"use server";

import { Suspense } from "react";
import LoadingSpinner from "./components/LoadingSpinner";
import PageClient from "./page-client";
import type { WIPEntry } from "@/src/types";

export default async function Page() {
  // Initialize with empty array instead of mock data
  const wipEntries: WIPEntry[] = [];

  // The server component just returns the layout and renders the client component inside Suspense.
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <PageClient initialEntries={wipEntries} />
    </Suspense>
  );
}