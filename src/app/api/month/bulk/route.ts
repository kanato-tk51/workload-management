import { requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { daysInMonth, parseYearMonth, toDate } from "@/lib/date";

export const dynamic = "force-dynamic";

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10;
}

export async function POST(request: Request) {
  const { session, response } = await requireSession();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const month = body?.month;
  const entries = body?.entries;

  if (typeof month !== "string" || !Array.isArray(entries)) {
    return Response.json({ error: "invalid payload" }, { status: 400 });
  }

  const parsed = parseYearMonth(month);
  if (!parsed) {
    return Response.json({ error: "invalid month" }, { status: 400 });
  }

  const { year, month: monthValue } = parsed;
  const totalDays = daysInMonth(year, monthValue);
  const start = new Date(Date.UTC(year, monthValue - 1, 1));
  const end = new Date(Date.UTC(year, monthValue - 1, totalDays + 1));

  const normalized = entries
    .filter((entry: any) => entry && typeof entry.projectItemId === "string")
    .map((entry: any) => ({
      date: entry.date,
      projectItemId: entry.projectItemId,
      value: roundToTenth(Number(entry.value || 0))
    }))
    .filter((entry: any) => typeof entry.date === "string" && entry.value > 0);

  const itemIds = Array.from(new Set(normalized.map((entry) => entry.projectItemId)));
  if (itemIds.length > 0) {
    const allowedItems = await prisma.projectItem.findMany({
      where: { id: { in: itemIds } },
      select: { id: true }
    });
    const allowedSet = new Set(allowedItems.map((item) => item.id));
    if (itemIds.some((id) => !allowedSet.has(id))) {
      return Response.json({ error: "invalid project item" }, { status: 400 });
    }
  }

  const totalsByDate = new Map<string, number>();
  for (const entry of normalized) {
    const dateObj = toDate(entry.date);
    if (!dateObj) {
      return Response.json({ error: "invalid date" }, { status: 400 });
    }
    const dateKey = entry.date;
    if (!dateKey.startsWith(month)) {
      return Response.json({ error: "date out of month" }, { status: 400 });
    }
    const current = totalsByDate.get(dateKey) ?? 0;
    totalsByDate.set(dateKey, roundToTenth(current + roundToTenth(entry.value)));
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const date = `${month}-${day.toString().padStart(2, "0")}`;
    const total = roundToTenth(totalsByDate.get(date) ?? 0);
    if (total !== 0 && total !== 100) {
      return Response.json({ error: "total must be 0 or 100" }, { status: 400 });
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.timeEntry.deleteMany({
      where: {
        userId: session.user.id,
        date: { gte: start, lt: end }
      }
    });
    if (normalized.length > 0) {
      await tx.timeEntry.createMany({
        data: normalized.map((entry) => ({
          userId: session.user.id,
          date: toDate(entry.date)!,
          projectItemId: entry.projectItemId,
          value: roundToTenth(entry.value)
        }))
      });
    }
  });

  return Response.json({ ok: true });
}
