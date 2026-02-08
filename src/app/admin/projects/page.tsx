import { revalidatePath } from "next/cache";

import AdminProjectsBulkSave from "@/components/admin/AdminProjectsBulkSave";
import ProjectUnitList from "@/components/admin/ProjectUnitList";
import { requireAdminAction } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function toOptionalString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function toRequiredString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export default async function ProjectsPage() {
  const [projects, units] = await Promise.all([
    prisma.project.findMany({
      include: {
        items: {
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
        },
        unitProjects: {
          include: { unit: true }
        }
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }, { name: "asc" }]
    }),
    prisma.unit.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true }
    })
  ]);
  const projectsByUnit = new Map<string, typeof projects>();
  for (const project of projects) {
    const unitId = project.unitProjects[0]?.unitId;
    if (!unitId) continue;
    const list = projectsByUnit.get(unitId);
    if (list) {
      list.push(project);
    } else {
      projectsByUnit.set(unitId, [project]);
    }
  }

  async function createProjectWithItems(formData: FormData) {
    "use server";
    await requireAdminAction();
    const name = toRequiredString(formData.get("name"));
    const unitId = toRequiredString(formData.get("unitId"));
    if (!name || !unitId) return;

    const itemNames = formData.getAll("itemName");
    const itemTypes = formData.getAll("itemType");
    const items = itemNames
      .map((value, index) => {
        if (typeof value !== "string") return null;
        const trimmed = value.trim();
        if (trimmed.length === 0) return null;
        const rawType = itemTypes[index];
        const type =
          typeof rawType === "string" && rawType.trim().length > 0
            ? rawType.trim()
            : null;
        return { name: trimmed, type };
      })
      .filter((item): item is { name: string; type: string | null } => item !== null);

    await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name,
          isActive: true
        }
      });
      await tx.unitProject.create({
        data: { unitId, projectId: project.id }
      });
      if (items.length > 0) {
        await tx.projectItem.createMany({
          data: items.map((item) => ({
            projectId: project.id,
            name: item.name,
            type: item.type,
            isActive: true
          }))
        });
      }
    });

    revalidatePath("/admin/projects");
  }

  async function updateProject(formData: FormData) {
    "use server";
    await requireAdminAction();
    const id = formData.get("projectId");
    const name = formData.get("name");
    if (typeof id !== "string") return;
    if (typeof name !== "string" || name.trim().length === 0) return;
    const unitId = toRequiredString(formData.get("unitId"));

    if (!unitId) {
      await prisma.project.update({
        where: { id },
        data: {
          name: name.trim(),
          isActive: true
        }
      });
      revalidatePath("/admin/projects");
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id },
        data: {
          name: name.trim(),
          isActive: true
        }
      });
      await tx.unitProject.deleteMany({ where: { projectId: id } });
      await tx.unitProject.create({
        data: { unitId, projectId: id }
      });
    });

    revalidatePath("/admin/projects");
  }

  async function deleteProject(formData: FormData) {
    "use server";
    await requireAdminAction();
    const id = formData.get("projectId");
    if (typeof id !== "string") return;

    await prisma.project.delete({ where: { id } }).catch(() => null);
    revalidatePath("/admin/projects");
  }

  async function updateProjectOrder(formData: FormData) {
    "use server";
    await requireAdminAction();
    const unitId = toRequiredString(formData.get("unitId"));
    if (!unitId) return;
    const projectIds = formData
      .getAll("projectId")
      .filter((value): value is string => typeof value === "string");
    if (projectIds.length === 0) return;

    const validProjects = await prisma.unitProject.findMany({
      where: { unitId, projectId: { in: projectIds } },
      select: { projectId: true }
    });
    const validSet = new Set(validProjects.map((entry) => entry.projectId));
    const ordered = projectIds.filter((id) => validSet.has(id));
    if (ordered.length === 0) return;

    await prisma.$transaction(
      ordered.map((projectId, index) =>
        prisma.project.update({
          where: { id: projectId },
          data: { sortOrder: index }
        })
      )
    );

    revalidatePath("/admin/projects");
  }

  async function addItem(formData: FormData) {
    "use server";
    await requireAdminAction();
    const projectId = formData.get("projectId");
    const name = formData.get("name");
    if (typeof projectId !== "string") return;
    if (typeof name !== "string" || name.trim().length === 0) return;

    await prisma.projectItem.create({
      data: {
        projectId,
        name: name.trim(),
        type: toOptionalString(formData.get("type")),
        isActive: true
      }
    });

    revalidatePath("/admin/projects");
  }

  async function updateItem(formData: FormData) {
    "use server";
    await requireAdminAction();
    const id = formData.get("itemId");
    const name = formData.get("name");
    if (typeof id !== "string") return;
    if (typeof name !== "string" || name.trim().length === 0) return;

    await prisma.projectItem.update({
      where: { id },
      data: {
        name: name.trim(),
        type: toOptionalString(formData.get("type")),
        isActive: true
      }
    });

    revalidatePath("/admin/projects");
  }

  async function deleteItem(formData: FormData) {
    "use server";
    await requireAdminAction();
    const id = formData.get("itemId");
    if (typeof id !== "string") return;

    await prisma.projectItem.delete({ where: { id } }).catch(() => null);
    revalidatePath("/admin/projects");
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-base text-slate-500">
          プロジェクトと開発項目（種類を含む）を管理します。
        </p>
      </div>

      {projects.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-base text-slate-500">
          まだプロジェクトが登録されていません。
        </div>
      )}

      <div className="space-y-4">
        {units.map((unit) => {
          const unitProjects = projectsByUnit.get(unit.id) ?? [];
          return (
            <details
              key={unit.id}
              data-details="admin-unit"
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <summary className="flex cursor-pointer items-center justify-between text-base font-semibold text-slate-700">
                <span className="text-lg">{unit.name}</span>
                <span className="flex items-center gap-3 text-base text-slate-500">
                  <span>{unitProjects.length}件</span>
                  <span className="details-closed">開く</span>
                  <span className="details-open">閉じる</span>
                  <AdminProjectsBulkSave />
                </span>
              </summary>

              <div className="mt-4 space-y-4">
                {unitProjects.length === 0 && (
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-base text-slate-500">
                    プロジェクトがありません。
                  </div>
                )}

                <ProjectUnitList
                  unitId={unit.id}
                  units={units}
                  projects={unitProjects.map((project) => {
                    const assignedUnits = new Set(project.unitProjects.map((up) => up.unitId));
                    const currentUnitId =
                      units.find((candidate) => assignedUnits.has(candidate.id))?.id ?? null;
                    return {
                      id: project.id,
                      name: project.name,
                      unitId: currentUnitId,
                      items: project.items.map((item) => ({
                        id: item.id,
                        name: item.name,
                        type: item.type ?? null
                      }))
                    };
                  })}
                  actions={{
                    createProjectWithItems,
                    updateProjectOrder,
                    updateProject,
                    deleteProject,
                    addItem,
                    updateItem,
                    deleteItem
                  }}
                />
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
