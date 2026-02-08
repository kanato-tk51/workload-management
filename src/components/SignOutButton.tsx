"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      className="text-sm text-slate-500 hover:text-slate-900"
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      ログアウト
    </button>
  );
}
