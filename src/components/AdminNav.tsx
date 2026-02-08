"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "まとめ" },
  { href: "/admin/domains", label: "許可ドメイン" },
  { href: "/admin/users", label: "社員管理" },
  { href: "/admin/progress", label: "入力状況" },
  { href: "/admin/units", label: "ユニット" },
  { href: "/admin/projects", label: "プロジェクト/開発項目" }
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href);
}

export default function AdminNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav className="flex flex-wrap gap-3 text-sm">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            className={
              active
                ? "rounded-full border border-slate-900 bg-slate-900 px-3 py-1 font-semibold text-white shadow-sm"
                : "rounded-full bg-white px-3 py-1 shadow-sm text-slate-700"
            }
            href={item.href}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
