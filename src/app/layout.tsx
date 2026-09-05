import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { ToastProvider } from "@/components/Toast";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LinkedIn AI Content Engine",
  description: "Enterprise-grade LinkedIn content generation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light">
      <body className={`${inter.className}`}>
        <ToastProvider>
          <Header />
          <main className="main-content">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
