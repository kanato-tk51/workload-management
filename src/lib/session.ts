import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";

export async function getSessionOrNull() {
  return getServerSession(authOptions);
}

export async function requireNamedSession() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/api/auth/signin");
  }
  if (!session.user?.displayName) {
    redirect("/onboarding");
  }
  return session;
}
