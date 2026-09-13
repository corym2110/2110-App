import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeAttribute } from "@/components/shell/ThemeAttribute";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "2110 Fitness",
  description: "Scheduling, members, and point of sale for 2110 Fitness",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <ClerkProvider>
          <ThemeAttribute />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}