import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { ToastProvider } from "@/components/Toast";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
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
      <body className={`${outfit.variable} ${jetbrainsMono.variable} ${outfit.className}`}>
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
