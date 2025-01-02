"use client";

import { Suspense } from "react";
import LoadingSpinner from "./components/LoadingSpinner";
import PageClient from "./page-client";
import type { WIPEntry } from "@/src/types";

export default function Page() {
  // Initialize with empty array instead of mock data
  const wipEntries: WIPEntry[] = [];

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <PageClient initialEntries={wipEntries} />
    </Suspense>
  );
}