"use client";

import { useState } from "react";

interface LLMChatPanelProps {
  invoiceId: string;
}

// This component provides a basic chat interface to "interact" with the LLM.
// In a real application, it would send the user's message to the LLM API and display the refined invoice text.
// Currently, it mocks the behavior and displays mock responses.
export default function LLMChatPanel({ invoiceId }: LLMChatPanelProps) {
  const [message, setMessage] = useState("");
  const [responses, setResponses] = useState<string[]>([]);

  const handleSend = async () => {
    // Here we would call the LLM API with `message`.
    // For now, we simulate the LLM by returning a mock refined response.
    const mockResponse = `Refined text for invoice ${invoiceId}: ${message}`;
    // Store both the user message and the mock LLM response
    setResponses((prev) => [...prev, `User: ${message}`, `LLM: ${mockResponse}`]);
    setMessage("");
  };

  return (
    <div className="border p-4 rounded bg-white">
      {/* Display all previous messages and responses */}
      <div className="flex flex-col space-y-2 mb-4">
        {responses.map((res, i) => (
          <div key={i} className="text-sm text-gray-700">
            {res}
          </div>
        ))}
      </div>

      {/* Input field for user to type messages and a button to send */}
      <div className="flex space-x-2">
        <input
          className="border p-2 rounded flex-1 text-sm"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask LLM to refine text..."
        />
        <button
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
          onClick={handleSend}
        >
          Send
        </button>
      </div>
    </div>
  );
}