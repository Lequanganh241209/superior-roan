import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aether OS | Autonomous App Architect",
  description: "The next-generation autonomous application builder.",
};

import { Toaster } from "sonner";
import { GlobalErrorSuppressor } from "@/components/GlobalErrorSuppressor";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={cn(inter.className, "min-h-screen bg-background antialiased selection:bg-primary/20 selection:text-primary")}>
        <GlobalErrorSuppressor />
        <div className="relative flex min-h-screen flex-col">
          <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 max-w-screen-2xl items-center">
              <div className="mr-4 hidden md:flex">
                <a className="mr-6 flex items-center space-x-2" href="/">
                  <span className="hidden font-bold sm:inline-block text-primary tracking-tighter">AETHER OS_</span>
                </a>
              </div>
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
        <Toaster position="bottom-right" theme="dark" />
      </body>
    </html>
  );
}
