import { requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { daysInMonth, formatDate, parseYearMonth, weekendDates } from "@/lib/date";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { session, response } = await requireSession();
  if (response) return response;

  const url = new URL(request.url);
  const monthParam = url.searchParams.get("month");
  if (!monthParam) {
    return Response.json({ error: "month is required" }, { status: 400 });
  }

  const parsed = parseYearMonth(monthParam);
  if (!parsed) {
    return Response.json({ error: "invalid month" }, { status: 400 });
  }

  const { year, month } = parsed;
  const totalDays = daysInMonth(year, month);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month - 1, totalDays + 1));

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, unitId: true }
  });

  if (!user) {
    return Response.json({ error: "user not found" }, { status: 404 });
  }

  const items = user.unitId
    ? await prisma.project.findMany({
        where: {
          isActive: true,
          unitProjects: { some: { unitId: user.unitId } }
        },
        include: {
          items: {
            where: { isActive: true },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
          }
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }, { name: "asc" }]
      })
    : [];

  const flattenedItems = items.flatMap((project) =>
    project.items.map((item) => ({
      id: item.id,
      projectId: project.id,
      projectName: project.name,
      itemName: item.name,
      type: item.type,
      sortOrder: item.sortOrder
    }))
  );

  const [entries, companyHolidays, personalHolidays] = await Promise.all([
    prisma.timeEntry.findMany({
      where: {
        userId: user.id,
        date: { gte: start, lt: end }
      }
    }),
    prisma.holidayCompany.findMany({
      where: { date: { gte: start, lt: end } }
    }),
    prisma.holidayPersonal.findMany({
      where: { userId: user.id, date: { gte: start, lt: end } }
    })
  ]);

  const holidays = new Set<string>();
  weekendDates(year, month).forEach((d) => holidays.add(d));
  companyHolidays.forEach((h) => holidays.add(h.date.toISOString().slice(0, 10)));
  personalHolidays.forEach((h) => holidays.add(h.date.toISOString().slice(0, 10)));

  return Response.json({
    month: monthParam,
    days: totalDays,
    items: flattenedItems,
    entries: entries.map((entry) => ({
      date: entry.date.toISOString().slice(0, 10),
      projectItemId: entry.projectItemId,
      value: Number(entry.value)
    })),
    holidays: Array.from(holidays).sort()
  });
}
