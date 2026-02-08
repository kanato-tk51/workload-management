import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";

export async function getAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/api/auth/signin");
  }
  if (!session.user?.displayName) {
    redirect("/onboarding");
  }
  return session;
}

export async function requireAdminAction() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.isAdmin) {
    throw new Error("Forbidden");
  }
  return session;
}
