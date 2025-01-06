"use client";

import { Suspense } from "react";
import LoadingSpinner from "./components/LoadingSpinner";
import PageClient from "./page-client";

export default function Page() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <PageClient />
    </Suspense>
  );
}