import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Reformer Pilates Malta | Studio by Gozde",
  description: "Join Gozde for premium Reformer Pilates sessions in Malta. Book your class today and transform your body and mind.",
  keywords: ["Reformer Pilates Malta", "Pilates Studio Malta", "Gozde Pilates", "Fitness Malta", "Wellness", "Private Pilates Classes", "Group Pilates Malta"],
  authors: [{ name: "Gozde" }],
  openGraph: {
    title: "Reformer Pilates Malta | Studio by Gozde",
    description: "Join Gozde for premium Reformer Pilates sessions in Malta. Transform your body and mind.",
    url: "https://www.reformerpilatesmalta.com",
    siteName: "Reformer Pilates Malta",
    images: [
      {
        url: '/default-hero.jpg',
        width: 1200,
        height: 630,
        alt: 'Reformer Pilates Malta Studio',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Reformer Pilates Malta | Studio by Gozde",
    description: "Premium Reformer Pilates sessions in Malta. Book your class today.",
    images: ['/default-hero.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: '/manifest.json',
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