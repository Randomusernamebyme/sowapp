import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Seek our Ways",
  description: "An interactive mission-based adventure app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-[var(--color-bg)] text-[var(--color-text)]`}>
        <ThemeProvider>
          <AuthProvider>
            <Navbar />
            <div className="pt-16">{children}</div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
