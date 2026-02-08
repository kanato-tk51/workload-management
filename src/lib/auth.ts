import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";

import { prisma } from "@/lib/prisma";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!googleClientId || !googleClientSecret) {
  throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
}

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret
    })
  ],
  session: {
    strategy: "database"
  },
  callbacks: {
    async signIn({ user }: { user: { email?: string | null } }) {
      if (!user.email) return false;

      const email = user.email.toLowerCase();
      const domain = email.split("@")[1];
      if (!domain) return false;

      const allowedDomainCount = await prisma.allowedDomain.count();
      if (allowedDomainCount > 0) {
        const allowed = await prisma.allowedDomain.findUnique({
          where: { domain }
        });
        if (!allowed) return false;
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && !existing.isActive) return false;

      return true;
    },
    async session({ session, user }: { session: any; user: any }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.unitId = user.unitId ?? null;
        session.user.displayName = user.displayName ?? null;
        session.user.displayNameEn = user.displayNameEn ?? null;
        const admin = await prisma.adminEmail.findUnique({
          where: { email: user.email }
        });
        session.user.isAdmin = Boolean(admin);
      }
      return session;
    }
  },
  events: {
    async createUser({ user }: { user: { id: string; email?: string | null; name?: string | null } }) {
      if (!user.id || !user.email) return;
      const email = user.email.toLowerCase();

      await prisma.user.update({
        where: { id: user.id },
        data: {
          displayName: user.name ?? null
        }
      });

      const adminCount = await prisma.adminEmail.count();
      if (adminCount === 0) {
        await prisma.adminEmail.create({ data: { email } });
      }
    }
  }
};
