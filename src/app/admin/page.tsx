import { prisma } from "@/lib/prisma";
import { daysInMonth, formatDate, getYearMonthNow, parseYearMonth, weekendDates } from "@/lib/date";

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

export default async function AdminHome() {
  const monthParam = getYearMonthNow();
  const parsed = parseYearMonth(monthParam)!;
  const { year, month } = parsed;
  const totalDays = daysInMonth(year, month);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month - 1, totalDays + 1));

  const [domainCount, adminCount, unitCount, projectCount, users, entries, personalHolidays, companyHolidays, holidayMap] =
    await Promise.all([
    prisma.allowedDomain.count(),
    prisma.adminEmail.count(),
    prisma.unit.count(),
    prisma.project.count(),
    prisma.user.findMany({ select: { id: true } }),
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
  weekendDates(year, month).forEach((d) => baseHolidays.add(d));
  companyHolidays.forEach((holiday) => {
    baseHolidays.add(holiday.date.toISOString().slice(0, 10));
  });
  for (let day = 1; day <= totalDays; day += 1) {
    const date = formatDate(year, month, day);
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

  let completedCount = 0;
  let incompleteCount = 0;
  users.forEach((user) => {
    const totals = entryMap.get(user.id) ?? new Map<string, number>();
    const personalSet = personalMap.get(user.id) ?? new Set<string>();
    let incompleteDays = 0;
    for (let day = 1; day <= totalDays; day += 1) {
      const date = formatDate(year, month, day);
      const total = Math.round((totals.get(date) ?? 0) * 10) / 10;
      const isHoliday = baseHolidays.has(date) || personalSet.has(date);
      const isComplete = isHoliday ? total === 0 || total === 100 : total === 100;
      if (!isComplete) {
        incompleteDays += 1;
      }
    }
    if (incompleteDays === 0) {
      completedCount += 1;
    } else {
      incompleteCount += 1;
    }
  });

  const cards = [
    { label: "許可ドメイン", value: domainCount },
    { label: "管理者メール", value: adminCount },
    { label: "ユニット", value: unitCount },
    { label: "プロジェクト", value: projectCount },
    { label: "社員数", value: users.length },
    { label: "完了 / 未完了", value: `${completedCount} / ${incompleteCount}` }
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="text-sm text-slate-500">{card.label}</div>
          <div className="mt-2 text-3xl font-semibold">{card.value}</div>
        </div>
      ))}
    </section>
  );
}
