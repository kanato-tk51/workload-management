import { getAdminSession } from "@/lib/admin";
import AdminNav from "@/components/AdminNav";
import Link from "next/link";

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();

  if (!session.user?.isAdmin) {
    return (
      <main className="min-h-screen p-8">
        <div className="mx-auto max-w-2xl rounded-lg border border-rose-200 bg-rose-50 p-6 text-rose-700">
          管理者権限がありません。
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">管理者コンソール</h1>
            <p className="text-sm text-slate-500">
              マスタ設定とエクスポートの管理
            </p>
          </div>
          <Link
            className="text-sm text-blue-600 hover:underline"
            href="/"
          >
            ホームへ戻る
          </Link>
        </header>
        <AdminNav />
        {children}
      </div>
    </main>
  );
}
