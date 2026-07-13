import { GeistSans, GeistMono } from "geist/font";
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tech Pack — Operations Dashboard",
  description: "Mobile-first intake and generation for sublimation orders."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh bg-zinc-50 font-sans text-zinc-950 antialiased">
        {children}
      </body>
    </html>
  );
}
