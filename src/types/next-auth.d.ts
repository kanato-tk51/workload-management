import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isAdmin: boolean;
      unitId: string | null;
      displayName: string | null;
      displayNameEn: string | null;
    } & DefaultSession["user"];
  }
}
