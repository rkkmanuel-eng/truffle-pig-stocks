import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quality Investment Alerts",
  description: "Screen stocks by proven investing strategies and get threshold alerts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-gray-900">
        <header className="border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <a href="/" className="text-lg font-bold">
              QIA
            </a>
          </div>
        </header>
        <div className="flex-1">{children}</div>
        <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
          Quality Investment Alerts &mdash; Not financial advice. Data from Financial Modeling
          Prep.
        </footer>
      </body>
    </html>
  );
}
