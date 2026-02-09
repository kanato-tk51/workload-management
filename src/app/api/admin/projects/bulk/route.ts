import { NextResponse } from "next/server";

import { requireAdminAction } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

type ProjectCreatePayload = {
  name: string;
  unitId: string;
  orderIndex?: number;
  items?: Array<{ name: string; type: string | null; orderIndex?: number }>;
};

type ProjectUpdatePayload = {
  id: string;
  name: string;
  unitId: string | null;
};

type ItemCreatePayload = {
  projectId: string;
  name: string;
  type: string | null;
  orderIndex?: number;
};

type ItemUpdatePayload = {
  id: string;
  name: string;
  type: string | null;
};

type OrderUpdatePayload = {
  unitId: string;
  projectIds: string[];
};

type ItemOrderUpdatePayload = {
  projectId: string;
  itemIds: string[];
};

type BulkPayload = {
  projectCreates?: ProjectCreatePayload[];
  projectUpdates?: ProjectUpdatePayload[];
  projectDeletes?: string[];
  itemCreates?: ItemCreatePayload[];
  itemUpdates?: ItemUpdatePayload[];
  itemDeletes?: string[];
  orderUpdates?: OrderUpdatePayload[];
  itemOrderUpdates?: ItemOrderUpdatePayload[];
};

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export async function POST(request: Request) {
  await requireAdminAction();

  let payload: BulkPayload;
  try {
    payload = (await request.json()) as BulkPayload;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const projectDeletes = toStringArray(payload.projectDeletes);
  const itemDeletes = toStringArray(payload.itemDeletes);
  const projectDeleteSet = new Set(projectDeletes);
  const itemDeleteSet = new Set(itemDeletes);

  const projectCreates = Array.isArray(payload.projectCreates)
    ? payload.projectCreates.filter(
        (entry) =>
          entry &&
          typeof entry.name === "string" &&
          typeof entry.unitId === "string" &&
          entry.unitId.trim().length > 0
      )
    : [];
  const projectUpdates = Array.isArray(payload.projectUpdates)
    ? payload.projectUpdates.filter(
        (entry) =>
          entry &&
          typeof entry.id === "string" &&
          typeof entry.name === "string" &&
          !projectDeleteSet.has(entry.id)
      )
    : [];
  const itemCreates = Array.isArray(payload.itemCreates)
    ? payload.itemCreates.filter(
        (entry) =>
          entry &&
          typeof entry.projectId === "string" &&
          typeof entry.name === "string" &&
          entry.name.trim().length > 0
      )
    : [];
  const itemUpdates = Array.isArray(payload.itemUpdates)
    ? payload.itemUpdates.filter(
        (entry) =>
          entry &&
          typeof entry.id === "string" &&
          typeof entry.name === "string" &&
          !itemDeleteSet.has(entry.id)
      )
    : [];
  const orderUpdates = Array.isArray(payload.orderUpdates)
    ? payload.orderUpdates.filter(
        (entry) =>
          entry &&
          typeof entry.unitId === "string" &&
          Array.isArray(entry.projectIds) &&
          entry.projectIds.length > 0
      )
    : [];
  const itemOrderUpdates = Array.isArray(payload.itemOrderUpdates)
    ? payload.itemOrderUpdates.filter(
        (entry) =>
          entry &&
          typeof entry.projectId === "string" &&
          Array.isArray(entry.itemIds) &&
          entry.itemIds.length > 0
      )
    : [];

  await prisma.$transaction(async (tx) => {
    if (projectDeletes.length > 0) {
      await tx.project.deleteMany({ where: { id: { in: projectDeletes } } });
    }

    if (itemDeletes.length > 0) {
      await tx.projectItem.deleteMany({ where: { id: { in: itemDeletes } } });
    }

    const createsByUnit = new Map<string, ProjectCreatePayload[]>();
    for (const entry of projectCreates) {
      const unitId = entry.unitId.trim();
      if (!unitId) continue;
      const list = createsByUnit.get(unitId);
      if (list) {
        list.push(entry);
      } else {
        createsByUnit.set(unitId, [entry]);
      }
    }

    for (const [unitId, entries] of createsByUnit) {
      const sorted = [...entries].sort((a, b) => {
        const aIndex = typeof a.orderIndex === "number" ? a.orderIndex : 0;
        const bIndex = typeof b.orderIndex === "number" ? b.orderIndex : 0;
        return aIndex - bIndex;
      });
      const min = await tx.project.findFirst({
        where: { unitProjects: { some: { unitId } } },
        orderBy: { sortOrder: "asc" },
        select: { sortOrder: true }
      });
      const base = min?.sortOrder ?? 0;
      const count = sorted.length;

      for (let index = 0; index < sorted.length; index += 1) {
        const entry = sorted[index];
        const name = entry.name.trim();
        if (!name) continue;
        const project = await tx.project.create({
          data: {
            name,
            isActive: true,
            sortOrder: base - (count - index)
          }
        });
        await tx.unitProject.create({
          data: { unitId, projectId: project.id }
        });
        const items = Array.isArray(entry.items) ? entry.items : [];
        const createItems = items
          .map((item, index) => {
            if (!item || typeof item.name !== "string") return null;
            const trimmed = item.name.trim();
            if (trimmed.length === 0) return null;
            const parsed =
              typeof item.orderIndex === "number" && Number.isFinite(item.orderIndex)
                ? item.orderIndex
                : index;
            return {
              name: trimmed,
              type: item.type && item.type.trim().length > 0 ? item.type.trim() : null,
              orderIndex: parsed
            };
          })
          .filter(
            (item): item is { name: string; type: string | null; orderIndex: number } =>
              item !== null
          )
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((item, index) => ({
            projectId: project.id,
            name: item.name,
            type: item.type,
            sortOrder: index,
            isActive: true
          }));
        if (createItems.length > 0) {
          await tx.projectItem.createMany({ data: createItems });
        }
      }
    }

    for (const entry of projectUpdates) {
      const name = entry.name.trim();
      if (!entry.id || !name) continue;
      await tx.project.update({
        where: { id: entry.id },
        data: { name, isActive: true }
      });
      if (entry.unitId) {
        await tx.unitProject.deleteMany({ where: { projectId: entry.id } });
        await tx.unitProject.create({
          data: { unitId: entry.unitId, projectId: entry.id }
        });
      }
    }

    for (const entry of itemUpdates) {
      const name = entry.name.trim();
      if (!entry.id || !name) continue;
      await tx.projectItem.update({
        where: { id: entry.id },
        data: {
          name,
          type: entry.type && entry.type.trim().length > 0 ? entry.type.trim() : null,
          isActive: true
        }
      });
    }

    if (itemCreates.length > 0) {
      const createsByProject = new Map<string, ItemCreatePayload[]>();
      for (const entry of itemCreates) {
        if (projectDeleteSet.has(entry.projectId)) continue;
        const list = createsByProject.get(entry.projectId);
        if (list) {
          list.push(entry);
        } else {
          createsByProject.set(entry.projectId, [entry]);
        }
      }

      for (const [projectId, entries] of createsByProject) {
        const max = await tx.projectItem.findFirst({
          where: { projectId },
          orderBy: { sortOrder: "desc" },
          select: { sortOrder: true }
        });
        const base = max?.sortOrder ?? -1;
        const ordered = entries
          .map((entry, index) => ({
            entry,
            orderIndex:
              typeof entry.orderIndex === "number" && Number.isFinite(entry.orderIndex)
                ? entry.orderIndex
                : index,
            originalIndex: index
          }))
          .sort((a, b) => {
            if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
            return a.originalIndex - b.originalIndex;
          });

        await tx.projectItem.createMany({
          data: ordered.map((item, index) => ({
            projectId,
            name: item.entry.name.trim(),
            type:
              item.entry.type && item.entry.type.trim().length > 0
                ? item.entry.type.trim()
                : null,
            sortOrder: base + index + 1,
            isActive: true
          }))
        });
      }
    }

    for (const entry of itemOrderUpdates) {
      if (projectDeleteSet.has(entry.projectId)) continue;
      const itemIds = entry.itemIds.filter(
        (id) => typeof id === "string" && !itemDeleteSet.has(id)
      );
      if (itemIds.length === 0) continue;
      const valid = await tx.projectItem.findMany({
        where: { projectId: entry.projectId, id: { in: itemIds } },
        select: { id: true }
      });
      const validSet = new Set(valid.map((row) => row.id));
      const ordered = itemIds.filter((id) => validSet.has(id));
      await Promise.all(
        ordered.map((itemId, index) =>
          tx.projectItem.update({
            where: { id: itemId },
            data: { sortOrder: index }
          })
        )
      );
    }

    for (const entry of orderUpdates) {
      const projectIds = entry.projectIds.filter((id) => typeof id === "string");
      if (projectIds.length === 0) continue;
      const valid = await tx.unitProject.findMany({
        where: { unitId: entry.unitId, projectId: { in: projectIds } },
        select: { projectId: true }
      });
      const validSet = new Set(valid.map((row) => row.projectId));
      const ordered = projectIds.filter((id) => validSet.has(id));
      await Promise.all(
        ordered.map((projectId, index) =>
          tx.project.update({
            where: { id: projectId },
            data: { sortOrder: index }
          })
        )
      );
    }
  });

  return NextResponse.json({ ok: true });
}
