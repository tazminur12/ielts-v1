import type { Metadata } from "next";
import { Inter, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ClientChatbot } from "./ClientChatbot";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "IELTS Practice Pro - Master Your IELTS Exam",
    template: "%s | IELTS Practice Pro",
  },
  description:
    "Professional IELTS online practice platform with mock tests, practice materials, and expert guidance.",
  applicationName: "IELTS Practice Pro",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName: "IELTS Practice Pro",
    title: "IELTS Practice Pro - Master Your IELTS Exam",
    description:
      "Practice with realistic mock tests, track your progress, and improve faster with AI feedback.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "IELTS Practice Pro",
    description:
      "Practice with realistic mock tests, track your progress, and improve faster with AI feedback.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${notoSansKr.variable}`}>
      <body className="antialiased font-sans">
        <Providers>
          {children}
          <ClientChatbot />
        </Providers>
      </body>
    </html>
  );
}
