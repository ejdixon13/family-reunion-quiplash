import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Family Quiplash",
  description: "A Quiplash-style party game for family reunions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
