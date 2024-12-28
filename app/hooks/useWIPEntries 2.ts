"use client";

import { useState, useEffect } from "react";
import { getJSON } from "../utils/requestHelpers";

// This custom hook fetches WIP entries from the backend.
// It returns the entries and a loading state. In a real app, it would hit an actual API endpoint.
export function useWIPEntries() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEntries() {
      // Attempt to fetch WIP entries as JSON
      const data = await getJSON("/api/timeEntries");
      setEntries(data || []);
      setLoading(false);
    }
    fetchEntries();
  }, []);

  return { entries, loading };
}