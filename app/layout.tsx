import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils"
import { HydrationFix } from "@/components/HydrationFix";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Support Ticket System",
  description: "Comprehensive support ticket management system with SLA tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="/hydration-fix.js" defer />
      </head>
      <body className={cn("bg-background", inter.className)} suppressHydrationWarning>
        <HydrationFix />
        {children}
      </body>
    </html>
  );
}