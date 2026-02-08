import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const [domainCount, adminCount, unitCount, projectCount] = await Promise.all([
    prisma.allowedDomain.count(),
    prisma.adminEmail.count(),
    prisma.unit.count(),
    prisma.project.count()
  ]);

  const cards = [
    { label: "許可ドメイン", value: domainCount },
    { label: "管理者メール", value: adminCount },
    { label: "ユニット", value: unitCount },
    { label: "プロジェクト", value: projectCount }
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="text-sm text-slate-500">{card.label}</div>
          <div className="mt-2 text-3xl font-semibold">{card.value}</div>
        </div>
      ))}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-slate-500">メモ</div>
        <p className="mt-2 text-sm text-slate-700">
          ここから各マスタを編集できます。最初に「許可ドメイン」と「管理者メール」を設定し、
          続けてユニット/プロジェクトを登録してください。
        </p>
      </div>
    </section>
  );
}
