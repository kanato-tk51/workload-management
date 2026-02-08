import type { Metadata } from "next";

import Header from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Workload Management",
  description: "社員の工数を管理するアプリ",
  icons: [{ rel: "icon", url: "/icon.svg" }]
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <Header />
        </div>
        <div className="mx-auto max-w-5xl px-6 pb-12">{children}</div>
      </body>
    </html>
  );
}
