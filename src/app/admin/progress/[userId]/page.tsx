import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getYearMonthNow, parseYearMonth } from "@/lib/date";
import TimesheetClient from "@/app/timesheet/TimesheetClient";

export const dynamic = "force-dynamic";

export default async function AdminUserProgressPage({
  params,
  searchParams
}: {
  params?: { userId?: string | string[] };
  searchParams?: { month?: string | string[] };
}) {
  const resolvedParams = await Promise.resolve(params);
  const userIdRaw = resolvedParams?.userId;
  const userId = Array.isArray(userIdRaw) ? userIdRaw[0] : userIdRaw;

  if (!userId) {
    notFound();
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, displayName: true }
  });

  if (!user) {
    notFound();
  }

  const monthParamRaw = searchParams?.month;
  const monthParam = Array.isArray(monthParamRaw) ? monthParamRaw[0] : monthParamRaw;
  const initialMonth = getYearMonthNow();
  const parsed = monthParam ? parseYearMonth(monthParam) : null;
  const month = parsed ? monthParam : initialMonth;

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm text-slate-500">社員</div>
        <div className="text-lg font-semibold text-slate-800">
          {user.displayName ?? user.email}
        </div>
        <div className="text-xs text-slate-500">閲覧専用</div>
      </div>
      <TimesheetClient
        initialMonth={month}
        readOnly
        dataEndpoint="/api/admin/month"
        userId={userId}
      />
    </section>
  );
}
