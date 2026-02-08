"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type UserStatus = {
  id: string;
  email: string;
  displayName: string | null;
  unitName: string | null;
  incompleteDays: number;
  status: "completed" | "incomplete";
};

type FilterValue = "all" | "completed" | "incomplete";

export default function AdminProgressTable({ statuses }: { statuses: UserStatus[] }) {
  const [filter, setFilter] = useState<FilterValue>("all");

  const filtered = useMemo(() => {
    if (filter === "completed") {
      return statuses.filter((user) => user.status === "completed");
    }
    if (filter === "incomplete") {
      return statuses.filter((user) => user.status === "incomplete");
    }
    return statuses;
  }, [filter, statuses]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-6 py-3">
        <div className="text-xs text-slate-500">表示フィルタ</div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterValue)}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="all">全員</option>
            <option value="completed">完了</option>
            <option value="incomplete">未完了</option>
          </select>
        </div>
      </div>
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-3 text-xs font-semibold text-slate-500">
        <div className="grid gap-2 md:grid-cols-[2fr_1.5fr_1fr_0.8fr_0.8fr]">
          <div>メール</div>
          <div>氏名</div>
          <div>ユニット</div>
          <div>状態</div>
          <div>未完了日数</div>
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="px-6 py-4 text-sm text-slate-500">
          対象の社員がいません。
        </div>
      ) : (
        <div className="divide-y divide-slate-200 text-sm">
          {filtered.map((user) => (
            <div
              key={user.id}
              className="grid gap-2 px-6 py-3 md:grid-cols-[2fr_1.5fr_1fr_0.8fr_0.8fr]"
            >
              <div className="text-slate-700">{user.email}</div>
              <div>
                <Link
                  className="text-slate-700 hover:underline"
                  href={`/admin/progress/${user.id}`}
                >
                  {user.displayName ?? user.email}
                </Link>
              </div>
              <div className="text-slate-500">{user.unitName ?? "未設定"}</div>
              <div
                className={user.status === "completed" ? "text-emerald-600" : "text-rose-600"}
              >
                {user.status === "completed" ? "完了" : "未完了"}
              </div>
              <div className="text-slate-600">{user.incompleteDays}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
