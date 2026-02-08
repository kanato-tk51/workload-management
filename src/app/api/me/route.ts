import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions as any);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }
  return Response.json({ user: session.user });
}
