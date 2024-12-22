import './globals.css';
import NavBar from "@/app/components/NavBar";

export const metadata = {
  title: "Invoice App",
  description: "A Next.js 13 app for WIP tracking and invoice generation"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-gray-50 dark:bg-dark-bg text-gray-900 dark:text-gray-100 transition-colors duration-200">
        <NavBar />
        <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full animate-fade-in">
          <div className="bg-white dark:bg-dark-card shadow-sm rounded-lg p-6 border border-gray-100 dark:border-dark-border">
            {children}
          </div>
        </main>
        <div className="h-20 sm:h-0" />
      </body>
    </html>
  );
}