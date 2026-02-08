import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/api/auth/signin");
  }

  const units = await prisma.unit.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });

  if (session.user?.displayName) {
    redirect("/");
  }

  async function saveName(formData: FormData) {
    "use server";
    const current = await getServerSession(authOptions);
    if (!current?.user?.id) {
      redirect("/api/auth/signin");
    }
    const rawName = formData.get("displayName");
    const rawUnitId = formData.get("unitId");
    if (typeof rawName !== "string" || rawName.trim().length === 0) {
      return;
    }
    if (typeof rawUnitId !== "string" || rawUnitId.trim().length === 0) {
      return;
    }

    await prisma.user.update({
      where: { id: current.user.id },
      data: {
        displayName: rawName.trim(),
        unitId: rawUnitId.trim()
      }
    });

    redirect("/");
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-lg space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <header>
          <h1 className="text-2xl font-semibold">氏名(フルネーム)を登録してください</h1>
        </header>

        <form action={saveName} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">氏名</label>
            <input
              name="displayName"
              placeholder="山田太郎"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">ユニット</label>
            <select
              name="unitId"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              required
              defaultValue=""
            >
              <option value="" disabled>
                選択してください
              </option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            保存
          </button>
        </form>
      </div>
    </main>
  );
}
