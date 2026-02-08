import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return {
      session: null,
      response: new Response("Unauthorized", { status: 401 })
    };
  }
  return { session, response: null };
}

export async function requireAdmin() {
  const { session, response } = await requireSession();
  if (response) return { session: null, response };
  if (!session?.user?.isAdmin) {
    return {
      session: null,
      response: new Response("Forbidden", { status: 403 })
    };
  }
  return { session, response: null };
}
