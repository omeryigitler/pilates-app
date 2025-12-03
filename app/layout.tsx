import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Reformer Pilates Malta | Studio by Gozde",
  description: "Join Gozde for premium Reformer Pilates sessions in Malta. Book your class today and transform your body and mind.",
  icons: {
    icon: '/reformer-pilates-logo.jpg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}