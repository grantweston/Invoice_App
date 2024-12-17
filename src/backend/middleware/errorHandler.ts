"use server";

// A simple error handler middleware that could wrap endpoints.
// For demonstration, we'll just show a pattern:
// In Next.js, we might handle this differently (in route handlers).

export async function errorHandler(fn: Function) {
  try {
    return await fn();
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}