import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ink to Form — Shared whiteboard",
  description: "A shared whiteboard for trackpad collaboration, clear text, and ideas that take shape.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
