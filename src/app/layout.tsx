import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TRACE",
  description: "TRACE 情绪支持对话系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="h-screen w-full overflow-hidden">{children}</body>
    </html>
  );
}
