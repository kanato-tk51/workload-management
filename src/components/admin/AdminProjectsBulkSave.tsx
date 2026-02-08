"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const DIRTY_SELECTOR = 'form[data-dirty="true"]';

function hasDirtyForms() {
  if (typeof document === "undefined") return false;
  return document.querySelector(DIRTY_SELECTOR) !== null;
}

export default function AdminProjectsBulkSave() {
  const router = useRouter();
  const [hasDirty, setHasDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const refresh = useCallback(() => {
    const dirty = hasDirtyForms();
    setHasDirty(dirty);
  }, []);

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener("wm:dirty-change", handler);
    return () => {
      window.removeEventListener("wm:dirty-change", handler);
    };
  }, [refresh]);

  useEffect(() => {
    if (!isSaving) return;
    let elapsed = 0;
    const interval = window.setInterval(() => {
      elapsed += 300;
      if (!hasDirtyForms()) {
        window.clearInterval(interval);
        setHasDirty(false);
        setIsSaving(false);
      } else if (elapsed >= 15000) {
        window.clearInterval(interval);
        setIsSaving(false);
      }
    }, 300);
    return () => {
      window.clearInterval(interval);
    };
  }, [isSaving]);

  const handleSaveAll = async () => {
    if (!hasDirty) return;
    setIsSaving(true);
    try {
      const forms = Array.from(document.querySelectorAll(DIRTY_SELECTOR)).filter(
        (form): form is HTMLFormElement => form instanceof HTMLFormElement
      );
      const payload = {
        projectCreates: [] as Array<{
          name: string;
          unitId: string;
          orderIndex: number;
          items: Array<{ name: string; type: string | null; orderIndex: number }>;
        }>,
        projectUpdates: [] as Array<{ id: string; name: string; unitId: string | null }>,
        projectDeletes: [] as string[],
        itemCreates: [] as Array<{
          projectId: string;
          name: string;
          type: string | null;
          orderIndex: number;
        }>,
        itemUpdates: [] as Array<{ id: string; name: string; type: string | null }>,
        itemDeletes: [] as string[],
        orderUpdates: [] as Array<{ unitId: string; projectIds: string[] }>
      };

      forms.forEach((form) => {
        const kind = form.dataset.kind;
        const data = new FormData(form);
        if (!kind) return;
        switch (kind) {
          case "project-update": {
            const id = data.get("projectId");
            const name = data.get("name");
            const unitId = data.get("unitId");
            if (typeof id !== "string" || typeof name !== "string") return;
            payload.projectUpdates.push({
              id,
              name,
              unitId:
                typeof unitId === "string" && unitId.trim().length > 0
                  ? unitId
                  : null
            });
            break;
          }
          case "project-delete": {
            const id = data.get("projectId");
            if (typeof id === "string") payload.projectDeletes.push(id);
            break;
          }
          case "project-create": {
            const name = data.get("name");
            const unitId = data.get("unitId");
            const orderIndex = data.get("orderIndex");
            if (typeof name !== "string" || typeof unitId !== "string") return;
            const itemNames = data.getAll("itemName");
            const itemTypes = data.getAll("itemType");
            const itemOrderIndexes = data.getAll("itemOrderIndex");
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
                const rawOrder = itemOrderIndexes[index];
                const parsed =
                  typeof rawOrder === "string" && rawOrder.trim().length > 0
                    ? Number(rawOrder)
                    : index;
                const orderIndexValue = Number.isFinite(parsed) ? parsed : index;
                return { name: trimmed, type, orderIndex: orderIndexValue };
              })
              .filter(
                (item): item is { name: string; type: string | null; orderIndex: number } =>
                  item !== null
              );
            payload.projectCreates.push({
              name: name.trim(),
              unitId: unitId.trim(),
              orderIndex:
                typeof orderIndex === "string" && orderIndex.trim().length > 0
                  ? Number(orderIndex)
                  : 0,
              items
            });
            break;
          }
          case "item-update": {
            const id = data.get("itemId");
            const name = data.get("name");
            const type = data.get("type");
            if (typeof id !== "string" || typeof name !== "string") return;
            payload.itemUpdates.push({
              id,
              name,
              type: typeof type === "string" && type.trim().length > 0 ? type : null
            });
            break;
          }
          case "item-delete": {
            const id = data.get("itemId");
            if (typeof id === "string") payload.itemDeletes.push(id);
            break;
          }
          case "item-create": {
            const projectId = data.get("projectId");
            const name = data.get("name");
            const type = data.get("type");
            if (typeof projectId !== "string" || typeof name !== "string") return;
            const trimmed = name.trim();
            if (trimmed.length === 0) return;
            const rawOrder = data.get("orderIndex");
            const parsed =
              typeof rawOrder === "string" && rawOrder.trim().length > 0
                ? Number(rawOrder)
                : 0;
            payload.itemCreates.push({
              projectId,
              name: trimmed,
              type: typeof type === "string" && type.trim().length > 0 ? type : null,
              orderIndex: Number.isFinite(parsed) ? parsed : 0
            });
            break;
          }
          case "order-update": {
            const unitId = data.get("unitId");
            const projectIds = data
              .getAll("projectId")
              .filter((value): value is string => typeof value === "string");
            if (typeof unitId !== "string" || projectIds.length === 0) return;
            payload.orderUpdates.push({ unitId, projectIds });
            break;
          }
          default:
            break;
        }
      });

      const response = await fetch("/api/admin/projects/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error("Failed to save");
      }
      setHasDirty(false);
      router.refresh();
      window.dispatchEvent(new Event("wm:bulk-save-complete"));
    } catch (error) {
      alert("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetAll = () => {
    if (!hasDirty || isSaving) return;
    if (!confirm("未保存の変更をすべて破棄しますか？")) return;
    setIsSaving(false);
    setHasDirty(false);
    window.dispatchEvent(new Event("wm:bulk-reset"));
    window.setTimeout(() => {
      router.refresh();
    }, 0);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          handleSaveAll();
        }}
        disabled={!hasDirty || isSaving}
        className={`rounded-md px-4 py-2 text-base font-semibold ${
          !hasDirty || isSaving
            ? "cursor-not-allowed bg-slate-200 text-slate-500"
            : "bg-slate-900 text-white"
        }`}
      >
        {isSaving ? "保存中..." : "変更を保存"}
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          handleResetAll();
        }}
        disabled={!hasDirty || isSaving}
        className={`rounded-md px-4 py-2 text-base font-semibold ${
          !hasDirty || isSaving
            ? "cursor-not-allowed bg-slate-200 text-slate-500"
            : "border border-rose-300 text-rose-700"
        }`}
      >
        リセット
      </button>
    </div>
  );
}
