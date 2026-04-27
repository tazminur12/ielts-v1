import type { Metadata } from "next";
import { Inter, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Chatbot } from "@/components/chatbot/Chatbot";

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
  title: "IELTS Practice Pro - Master Your IELTS Exam",
  description: "Professional IELTS online practice platform with mock tests, practice materials, and expert guidance.",
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
          <Chatbot />
        </Providers>
      </body>
    </html>
  );
}
