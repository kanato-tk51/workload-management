import { prisma } from "@/lib/prisma";
import { daysInMonth, formatDate, getYearMonthNow, parseYearMonth, weekendDates } from "@/lib/date";
import AdminProgressTable from "@/components/admin/AdminProgressTable";
import AdminProgressMonthSelect from "@/components/admin/AdminProgressMonthSelect";

export const dynamic = "force-dynamic";

const HOLIDAY_API = "https://holidays-jp.github.io/api/v1/date.json";
let holidayCache: { data: Record<string, string>; fetchedAt: number } | null = null;

async function getHolidayMap() {
  const now = Date.now();
  if (holidayCache && now - holidayCache.fetchedAt < 1000 * 60 * 60 * 12) {
    return holidayCache.data;
  }
  const res = await fetch(HOLIDAY_API, { cache: "no-store" }).catch(() => null);
  if (!res || !res.ok) {
    return holidayCache?.data ?? {};
  }
  const data = (await res.json()) as Record<string, string>;
  holidayCache = { data, fetchedAt: now };
  return data;
}

type UserStatus = {
  id: string;
  email: string;
  displayName: string | null;
  unitName: string | null;
  incompleteDays: number;
  status: "completed" | "incomplete";
};

export default async function AdminProgressPage({
  searchParams
}: {
  searchParams?: Promise<{ month?: string | string[] }>;
}) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const monthParamRaw = resolvedParams?.month;
  const monthParam = Array.isArray(monthParamRaw) ? monthParamRaw[0] : monthParamRaw;
  const initialMonth = getYearMonthNow();
  const parsed = monthParam ? parseYearMonth(monthParam) : null;
  const month = parsed ? monthParam! : initialMonth;
  const { year, month: monthValue } = parsed ?? parseYearMonth(initialMonth)!;
  const totalDays = daysInMonth(year, monthValue);
  const start = new Date(Date.UTC(year, monthValue - 1, 1));
  const end = new Date(Date.UTC(year, monthValue - 1, totalDays + 1));

  const [users, entries, personalHolidays, companyHolidays, holidayMap] = await Promise.all([
    prisma.user.findMany({
      include: { unit: true },
      orderBy: [{ createdAt: "desc" }]
    }),
    prisma.timeEntry.findMany({
      where: { date: { gte: start, lt: end } },
      select: { userId: true, date: true, value: true }
    }),
    prisma.holidayPersonal.findMany({
      where: { date: { gte: start, lt: end } },
      select: { userId: true, date: true }
    }),
    prisma.holidayCompany.findMany({
      where: { date: { gte: start, lt: end } },
      select: { date: true }
    }),
    getHolidayMap()
  ]);

  const baseHolidays = new Set<string>();
  weekendDates(year, monthValue).forEach((d) => baseHolidays.add(d));
  companyHolidays.forEach((holiday) => {
    baseHolidays.add(holiday.date.toISOString().slice(0, 10));
  });
  for (let day = 1; day <= totalDays; day += 1) {
    const date = formatDate(year, monthValue, day);
    if (holidayMap[date]) {
      baseHolidays.add(date);
    }
  }

  const entryMap = new Map<string, Map<string, number>>();
  entries.forEach((entry) => {
    const userMap = entryMap.get(entry.userId) ?? new Map<string, number>();
    const dateKey = entry.date.toISOString().slice(0, 10);
    const current = userMap.get(dateKey) ?? 0;
    userMap.set(dateKey, current + Number(entry.value));
    entryMap.set(entry.userId, userMap);
  });

  const personalMap = new Map<string, Set<string>>();
  personalHolidays.forEach((holiday) => {
    const userSet = personalMap.get(holiday.userId) ?? new Set<string>();
    userSet.add(holiday.date.toISOString().slice(0, 10));
    personalMap.set(holiday.userId, userSet);
  });

  const statuses: UserStatus[] = users.map((user) => {
    const totals = entryMap.get(user.id) ?? new Map<string, number>();
    const personalSet = personalMap.get(user.id) ?? new Set<string>();
    let incompleteDays = 0;
    for (let day = 1; day <= totalDays; day += 1) {
      const date = formatDate(year, monthValue, day);
      const total = Math.round((totals.get(date) ?? 0) * 10) / 10;
      const isHoliday = baseHolidays.has(date) || personalSet.has(date);
      const isComplete = isHoliday ? total === 0 || total === 100 : total === 100;
      if (!isComplete) {
        incompleteDays += 1;
      }
    }
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName ?? null,
      unitName: user.unit?.name ?? null,
      incompleteDays,
      status: incompleteDays === 0 ? "completed" : "incomplete"
    };
  });

  const completed = statuses.filter((user) => user.status === "completed");
  const incomplete = statuses.filter((user) => user.status === "incomplete");

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">月次完了状況</h2>
            <p className="text-sm text-slate-500">
              月ごとの入力完了/未完了を確認できます。
            </p>
          </div>
          <AdminProgressMonthSelect month={month} />
        </div>
        <div className="mt-4 text-sm text-slate-600">
          社員数 {statuses.length}人 / 完了 {completed.length}人 / 未完了 {incomplete.length}人
        </div>
      </div>

      <AdminProgressTable statuses={statuses} />
    </section>
  );
}
