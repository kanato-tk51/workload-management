import { requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { toDate } from "@/lib/date";

export const dynamic = "force-dynamic";

function getDate(value: unknown) {
  if (typeof value !== "string") return null;
  return toDate(value);
}

export async function POST(request: Request) {
  const { session, response } = await requireSession();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const date = getDate(body?.date);
  if (!date) {
    return Response.json({ error: "date is required" }, { status: 400 });
  }

  await prisma.holidayPersonal.upsert({
    where: {
      userId_date: {
        userId: session.user.id,
        date
      }
    },
    update: {},
    create: {
      userId: session.user.id,
      date,
      name: "個人休"
    }
  });

  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { session, response } = await requireSession();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const date = getDate(body?.date);
  if (!date) {
    return Response.json({ error: "date is required" }, { status: 400 });
  }

  await prisma.holidayPersonal.deleteMany({
    where: {
      userId: session.user.id,
      date
    }
  });

  return Response.json({ ok: true });
}
