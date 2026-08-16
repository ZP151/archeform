import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Archeform · 元象",
  description: "Describe, shape, and publish a working product.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
