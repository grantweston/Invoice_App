"use server";

import { Suspense } from "react";
import ProjectSummary from "@/app/components/ProjectSummary";
import LoadingSpinner from "@/app/components/LoadingSpinner";

// This page shows details for a specific client, including their projects and hours spent.
// The client ID is retrieved from the URL params. Real data would come from a database or API.
export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;

  // Mock client data
  const clientData = {
    name: "Client A",
    projects: [
      { name: "Project Alpha", totalHours: 10.5, description: "Detailed bookkeeping and tax preparation" },
      { name: "Project Gamma", totalHours: 3, description: "Quarterly review" }
    ]
  };

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <div>
        {/* Display the client's name */}
        <h1 className="text-xl font-bold mb-4">Client: {clientData.name}</h1>
        {/* Render a summary of each project for this client */}
        {clientData.projects.map((proj, idx) => (
          <ProjectSummary
            key={idx}
            projectName={proj.name}
            totalHours={proj.totalHours}
            description={proj.description}
          />
        ))}
      </div>
    </Suspense>
  );
}