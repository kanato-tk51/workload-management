"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function AdminProgressMonthSelect({ month }: { month: string }) {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <input
      type="month"
      value={month}
      onChange={(e) => {
        const value = e.target.value;
        const search = new URLSearchParams(params?.toString());
        if (value) {
          search.set("month", value);
        } else {
          search.delete("month");
        }
        const query = search.toString();
        router.push(query ? `/admin/progress?${query}` : "/admin/progress");
      }}
      className="rounded-md border border-slate-200 px-3 py-2 text-sm"
    />
  );
}
