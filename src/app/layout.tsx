import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Workload Management",
  description: "社員の工数を管理するアプリ"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
