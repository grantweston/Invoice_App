import './globals.css';
import NavBar from "@/app/components/NavBar";

export const metadata = {
  title: "Invoice App",
  description: "A Next.js 13 app for WIP tracking and invoice generation"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-gray-100 text-gray-900">
        <NavBar />
        <main className="flex-1 p-4">
          {children}
        </main>
      </body>
    </html>
  );
}