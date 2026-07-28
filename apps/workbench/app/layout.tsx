import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Factory Pilot Workbench",
  description: "A controlled product-definition workbench.",
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
