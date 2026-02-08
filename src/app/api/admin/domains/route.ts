import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

function normalizeDomain(domain: string) {
  return domain.trim().toLowerCase();
}

function isValidDomain(domain: string) {
  return /^[a-z0-9.-]+$/.test(domain);
}

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  const domains = await prisma.allowedDomain.findMany({
    orderBy: { domain: "asc" }
  });
  return Response.json(domains);
}

export async function POST(request: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const rawDomain = body?.domain;
  if (!rawDomain || typeof rawDomain !== "string") {
    return Response.json({ error: "domain is required" }, { status: 400 });
  }

  const domain = normalizeDomain(rawDomain);
  if (!isValidDomain(domain)) {
    return Response.json({ error: "invalid domain" }, { status: 400 });
  }

  const created = await prisma.allowedDomain.upsert({
    where: { domain },
    create: { domain },
    update: {}
  });

  return Response.json(created, { status: 201 });
}

export async function DELETE(request: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const rawDomain = body?.domain;
  if (!rawDomain || typeof rawDomain !== "string") {
    return Response.json({ error: "domain is required" }, { status: 400 });
  }

  const domain = normalizeDomain(rawDomain);
  if (!isValidDomain(domain)) {
    return Response.json({ error: "invalid domain" }, { status: 400 });
  }

  try {
    await prisma.allowedDomain.delete({ where: { domain } });
  } catch {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
