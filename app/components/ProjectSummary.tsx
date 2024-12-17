"use client";

interface ProjectSummaryProps {
  projectName: string;
  totalHours: number;
  description: string;
}

// This component shows a summary of a single project, including its name, total hours, and a description of the work.
export default function ProjectSummary({ projectName, totalHours, description }: ProjectSummaryProps) {
  return (
    <div className="border p-4 mb-4 rounded bg-white">
      <h3 className="font-bold text-md mb-1">{projectName}</h3>
      <p className="text-sm mb-1">Total Hours: {totalHours.toFixed(2)}</p>
      <p className="text-sm text-gray-700">{description}</p>
    </div>
  );
}