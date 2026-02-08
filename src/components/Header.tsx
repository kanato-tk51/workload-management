import Link from "next/link";

import SignOutButton from "@/components/SignOutButton";
import { getSessionOrNull } from "@/lib/session";

export default async function Header() {
  const session = await getSessionOrNull();
  const now = new Date();
  const formattedDate = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short"
  }).format(now);

  return (
    <header className="flex items-center justify-between">
      <Link className="text-3xl font-semibold text-slate-700" href="/">
        工数管理くん
      </Link>
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <span>{formattedDate}</span>
        {session?.user?.displayName && (
          <span>こんにちは、{session.user.displayName}さん</span>
        )}
        {session?.user?.isAdmin && (
          <Link
            className="rounded-md bg-slate-900 px-3 py-1 font-semibold text-white"
            href="/admin"
          >
            管理者コンソール
          </Link>
        )}
        {session ? (
          <SignOutButton />
        ) : (
          <Link className="text-xs text-blue-600 hover:underline" href="/api/auth/signin">
            ログイン
          </Link>
        )}
      </div>
    </header>
  );
}
