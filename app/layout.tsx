import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Happy First Club - Build Your Wellth",
  description: "Track your wellness activities, build healthy habits, and grow together with the community",
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
