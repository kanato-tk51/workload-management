import { revalidatePath } from "next/cache";

import { requireAdminAction } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function normalizeDomain(domain: string) {
  return domain.trim().toLowerCase();
}

function isValidDomain(domain: string) {
  return /^[a-z0-9.-]+$/.test(domain);
}

export default async function DomainsPage() {
  const domains = await prisma.allowedDomain.findMany({
    orderBy: { domain: "asc" }
  });

  async function addDomain(formData: FormData) {
    "use server";
    await requireAdminAction();
    const raw = formData.get("domain");
    if (typeof raw !== "string") return;
    const domain = normalizeDomain(raw);
    if (!domain || !isValidDomain(domain)) return;

    await prisma.allowedDomain.upsert({
      where: { domain },
      create: { domain },
      update: {}
    });

    revalidatePath("/admin/domains");
  }

  async function deleteDomain(formData: FormData) {
    "use server";
    await requireAdminAction();
    const raw = formData.get("domain");
    if (typeof raw !== "string") return;
    const domain = normalizeDomain(raw);
    if (!domain) return;

    await prisma.allowedDomain.delete({ where: { domain } }).catch(() => null);
    revalidatePath("/admin/domains");
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">許可ドメイン</h2>
        <p className="text-sm text-slate-500">
          Googleログインで許可するドメインを登録します。
        </p>
        <form action={addDomain} className="mt-4 flex flex-wrap gap-2">
          <input
            name="domain"
            placeholder="example.com"
            className="w-64 rounded-md border border-slate-200 px-3 py-2 text-sm"
            required
          />
          <button
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            type="submit"
          >
            追加
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-600">登録済み</h3>
        <ul className="mt-3 divide-y divide-slate-100 text-sm">
          {domains.length === 0 && (
            <li className="py-3 text-slate-500">まだ登録がありません。</li>
          )}
          {domains.map((domain) => (
            <li key={domain.domain} className="flex items-center justify-between py-3">
              <span>{domain.domain}</span>
              <form action={deleteDomain}>
                <input type="hidden" name="domain" value={domain.domain} />
                <button
                  className="text-xs text-rose-600 hover:underline"
                  type="submit"
                >
                  削除
                </button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
