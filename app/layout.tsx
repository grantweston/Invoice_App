"use server";

import './styles/globals.css';
import NavBar from "./components/NavBar";

export const metadata = {
  title: "Invoice App",
  description: "A Next.js 13 app for WIP tracking and invoice generation"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The RootLayout wraps all pages, providing a consistent navbar and styling.
  // The <html> and <body> tags are customized to ensure a full-height, flexible layout.
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        {/* Top-level navigation bar rendered at all times */}
        <NavBar />
        {/* Main container where the actual page content (children) is displayed */}
        <main className="flex-1 p-4">
          {children}
        </main>
      </body>
    </html>
  );
}