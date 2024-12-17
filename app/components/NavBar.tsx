"use client";

import Link from "next/link";

// This navigation bar provides links to different parts of the app.
// Currently links to Home and Daily Report; more links can be added as needed.
export default function NavBar() {
  return (
    <nav className="w-full bg-blue-700 text-white p-4 flex space-x-4">
      <Link href="/">Home</Link>
      <Link href="/daily-report">Daily Report</Link>
      {/* Additional links like /client/<id>, /invoice/<id> can be added dynamically */}
    </nav>
  );
}