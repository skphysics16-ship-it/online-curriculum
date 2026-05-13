import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "온라인 교육과정 안내 | 세광고등학교",
  description: "2026년 2학기 충북 온라인학교 수강 신청 안내",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
