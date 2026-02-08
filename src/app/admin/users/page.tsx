import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminAction } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import UsersBulkForm from "@/components/admin/UsersBulkForm";

export const dynamic = "force-dynamic";

function toOptionalString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export default async function UsersPage() {
  const [users, units, admins] = await Promise.all([
    prisma.user.findMany({
      include: { unit: true },
      orderBy: [{ createdAt: "desc" }]
    }),
    prisma.unit.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    }),
    prisma.adminEmail.findMany({
      orderBy: { email: "asc" }
    })
  ]);
  const adminSet = new Set(admins.map((admin) => admin.email));

  async function updateUsers(formData: FormData) {
    "use server";
    await requireAdminAction();
    const userIds = formData
      .getAll("userId")
      .filter((value): value is string => typeof value === "string");
    if (userIds.length === 0) return;

    await prisma.$transaction(async (tx) => {
      for (const id of userIds) {
        const email = toOptionalString(formData.get(`email:${id}`));
        if (!email) continue;
        const shouldDelete = formData.get(`delete:${id}`) === "1";
        if (shouldDelete) {
          await tx.adminEmail.deleteMany({ where: { email } });
          await tx.user.delete({ where: { id } });
          continue;
        }
        const displayName = toOptionalString(formData.get(`displayName:${id}`));
        if (!displayName) continue;
        const unitIdRaw = toOptionalString(formData.get(`unitId:${id}`));
        await tx.user.update({
          where: { id },
          data: {
            displayName,
            unitId: unitIdRaw ?? null
          }
        });
        const isAdmin = formData.get(`isAdmin:${id}`) === "on";
        if (isAdmin) {
          await tx.adminEmail.upsert({
            where: { email },
            update: {},
            create: { email }
          });
        } else {
          await tx.adminEmail.deleteMany({ where: { email } });
        }
      }
    });

    revalidatePath("/admin/users");
    redirect("/admin/users");
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">社員管理</h2>
        <p className="text-sm text-slate-500">
          社員のユニット割当、管理者設定、削除をまとめて保存します。
        </p>
      </div>

      {users.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          まだ社員が登録されていません。
        </div>
      ) : (
        <UsersBulkForm
          action={updateUsers}
          units={units.map((unit) => ({ id: unit.id, name: unit.name }))}
          users={users.map((user) => ({
            id: user.id,
            email: user.email,
            displayName: user.displayName ?? null,
            unitId: user.unitId ?? null,
            isAdmin: adminSet.has(user.email)
          }))}
        />
      )}
    </section>
  );
}
