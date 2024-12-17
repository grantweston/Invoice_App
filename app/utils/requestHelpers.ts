// getJSON fetches a URL and returns the parsed JSON response.
// Throws an error if the response is not OK (non-2xx status code).
export async function getJSON(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.json();
}

// postJSON sends a POST request with JSON data to a given URL and returns the parsed JSON response.
// Also throws an error if the response is not OK.
export async function postJSON(url: string, data: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`Failed to post to ${url}`);
  return res.json();
}