"use client";

interface WIPEntry {
  id: number;
  client: string;
  project: string;
  hours: number;
  description: string;
}

interface WIPTableProps {
  initialData: WIPEntry[];
}

// This component displays a table of WIP entries, showing client, project, hours, and description.
export default function WIPTable({ initialData }: WIPTableProps) {
  return (
    <div className="overflow-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="p-2 text-left">Client</th>
            <th className="p-2 text-left">Project</th>
            <th className="p-2 text-left">Hours</th>
            <th className="p-2 text-left">Description</th>
          </tr>
        </thead>
        <tbody>
          {initialData.map((entry) => (
            <tr key={entry.id} className="border-b border-gray-100">
              <td className="p-2">{entry.client}</td>
              <td className="p-2">{entry.project}</td>
              {/* Format hours to two decimal places */}
              <td className="p-2">{entry.hours.toFixed(2)}</td>
              <td className="p-2">{entry.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}