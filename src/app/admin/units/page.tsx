import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function UnitsPage() {
  const units = await prisma.unit.findMany({
    include: {
      unitProjects: {
        include: { project: true }
      },
      _count: {
        select: { users: true }
      }
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });

  async function addUnit(formData: FormData) {
    "use server";
    await requireAdminAction();
    const name = formData.get("name");
    if (typeof name !== "string" || name.trim().length === 0) return;

    await prisma.unit.create({
      data: {
        name: name.trim(),
        sortOrder: 0
      }
    });

    revalidatePath("/admin/units");
  }

  async function updateUnit(formData: FormData) {
    "use server";
    await requireAdminAction();
    const id = formData.get("unitId");
    const name = formData.get("name");
    if (typeof id !== "string") return;
    if (typeof name !== "string" || name.trim().length === 0) return;

    await prisma.unit.update({
      where: { id },
      data: {
        name: name.trim(),
        sortOrder: 0
      }
    });

    revalidatePath("/admin/units");
  }

  async function deleteUnit(formData: FormData) {
    "use server";
    await requireAdminAction();
    const id = formData.get("unitId");
    if (typeof id !== "string") return;

    await prisma.unit.delete({ where: { id } }).catch(() => null);
    revalidatePath("/admin/units");
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">ユニット</h2>
        <p className="text-sm text-slate-500">部署やチームの単位を管理します。</p>
        <form action={addUnit} className="mt-4 flex flex-wrap gap-2">
          <input
            name="name"
            placeholder="ユニット名"
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

      <div className="space-y-4">
        {units.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            まだユニットが登録されていません。
          </div>
        )}

        {units.map((unit) => {
          const assignedProjects = unit.unitProjects
            .map((up) => up.project)
            .sort((a, b) => {
              const orderDiff = a.sortOrder - b.sortOrder;
              if (orderDiff !== 0) return orderDiff;
              return a.name.localeCompare(b.name, "ja");
            });
          return (
            <div key={unit.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <form action={updateUnit} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="unitId" value={unit.id} />
                    <input
                      name="name"
                      defaultValue={unit.name}
                      className="w-56 rounded-md border border-slate-200 px-3 py-2 text-sm"
                    />
                    <button
                      className="rounded-md bg-slate-800 px-3 py-2 text-xs font-medium text-white"
                      type="submit"
                    >
                      更新
                    </button>
                  </form>
                  <form action={deleteUnit}>
                    <input type="hidden" name="unitId" value={unit.id} />
                    <button
                      className="rounded-md bg-rose-600 px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                      type="submit"
                      disabled={unit._count.users > 0}
                    >
                      {unit._count.users > 0 ? "削除不可" : "削除"}
                    </button>
                  </form>
                </div>
                <div className="text-xs text-slate-500">
                  所属社員: {unit._count.users}名
                </div>
              </div>

              <div className="mt-4">
                <div className="text-xs font-semibold text-slate-600">プロジェクト割当</div>
                {assignedProjects.length === 0 ? (
                  <div className="mt-2 text-sm text-slate-500">
                    割当プロジェクトがありません。
                  </div>
                ) : (
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {assignedProjects.map((project) => (
                      <div key={project.id} className="text-sm text-slate-700">
                        {project.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
