// This function sorts an array of clients by their name property alphabetically.
// It mutates the original array and returns the sorted result.
export function sortClientsByName(clients: { name: string }[]) {
  return clients.sort((a, b) => a.name.localeCompare(b.name));
}