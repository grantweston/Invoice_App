"use client";

interface Client {
  id: number;
  name: string;
}

interface ClientListProps {
  clients: Client[];
}

// This component takes a list of clients and displays them in a simple list format.
// In a real app, this could be linked to their detail pages.
export default function ClientList({ clients }: ClientListProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Clients</h2>
      <ul className="list-disc list-inside">
        {clients.map((client) => (
          <li key={client.id} className="text-sm text-gray-800">
            {client.name}
          </li>
        ))}
      </ul>
    </div>
  );
}