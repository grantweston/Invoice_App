"use client";

import { useState } from "react";
import { useRouter } from 'next/navigation';
import WIPTable from "./components/WIPTable";

interface PageClientProps {
  wipEntries: any[];
}

export default function PageClient({ wipEntries }: PageClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const startWorkSession = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/work-session/start', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to start session');
      const data = await res.json();
      alert(data.message);
      router.refresh();
    } catch (error) {
      console.error('Failed to start session:', error);
      alert("Failed to start work session");
    } finally {
      setLoading(false);
    }
  };

  const endWorkSession = async () => {
    setLoading(true);
    try {
      await fetch('/api/work-session/stop', { method: 'POST' });
      const res = await fetch('/api/dailyReport', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to generate daily report');
      router.push('/daily-report');
    } catch (error) {
      console.error('Failed to end session:', error);
      alert("Failed to end work session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Work In Progress (WIP) Dashboard</h1>

      <div className="mb-4 flex space-x-2">
        <button
          type="button"
          className="bg-green-600 text-white px-3 py-1 rounded text-sm"
          onClick={startWorkSession}
          disabled={loading}
        >
          {loading ? "Starting..." : "Begin Work Session"}
        </button>

        <button
          type="button"
          className="bg-red-600 text-white px-3 py-1 rounded text-sm"
          onClick={endWorkSession}
          disabled={loading}
        >
          {loading ? "Generating Report..." : "End Work Session"}
        </button>

        <button
          type="button"
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm ml-2"
          onClick={async () => {
            const res = await fetch('/api/test-screen-capture');
            const data = await res.json();
            alert(`Screen watching test:\n${JSON.stringify(data, null, 2)}`);
          }}
        >
          Test Screen Capture
        </button>
      </div>

      <WIPTable initialData={wipEntries} />
    </div>
  );
}