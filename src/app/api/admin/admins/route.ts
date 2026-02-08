import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  const admins = await prisma.adminEmail.findMany({
    orderBy: { email: "asc" }
  });
  return Response.json(admins);
}

export async function POST(request: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const rawEmail = body?.email;
  if (!rawEmail || typeof rawEmail !== "string") {
    return Response.json({ error: "email is required" }, { status: 400 });
  }

  const email = normalizeEmail(rawEmail);
  if (!isValidEmail(email)) {
    return Response.json({ error: "invalid email" }, { status: 400 });
  }

  const created = await prisma.adminEmail.upsert({
    where: { email },
    create: { email },
    update: {}
  });

  return Response.json(created, { status: 201 });
}

export async function DELETE(request: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const rawEmail = body?.email;
  if (!rawEmail || typeof rawEmail !== "string") {
    return Response.json({ error: "email is required" }, { status: 400 });
  }

  const email = normalizeEmail(rawEmail);
  if (!isValidEmail(email)) {
    return Response.json({ error: "invalid email" }, { status: 400 });
  }

  try {
    await prisma.adminEmail.delete({ where: { email } });
  } catch {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
