"use client";

import { useCallback, useEffect, useState } from "react";

type UnitOption = {
  id: string;
  name: string;
};

type DraftItem = {
  id: number;
  name: string;
  type: string;
};

type ProjectDraftRowProps = {
  draft: {
    id: number;
    name: string;
    unitId: string;
  };
  units: UnitOption[];
  orderIndex: number;
  action: (formData: FormData) => void | Promise<void>;
  onRemove: (id: number) => void;
};

export default function ProjectDraftRow({
  draft,
  units,
  orderIndex,
  action,
  onRemove
}: ProjectDraftRowProps) {
  const [name, setName] = useState(draft.name);
  const [unitId, setUnitId] = useState(draft.unitId);
  const [items, setItems] = useState<DraftItem[]>([{ id: 0, name: "", type: "" }]);
  const [nextItemId, setNextItemId] = useState(1);

  const isDirty = name.trim().length > 0;

  useEffect(() => {
    window.dispatchEvent(new Event("wm:dirty-change"));
  }, [isDirty]);

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, { id: nextItemId, name: "", type: "" }]);
    setNextItemId((prev) => prev + 1);
  }, [nextItemId]);

  const removeItem = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateItem = useCallback((id: number, field: "name" | "type", value: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }, []);

  const handleRemove = useCallback(() => {
    onRemove(draft.id);
  }, [draft.id, onRemove]);

  return (
    <form
      action={action}
      data-kind="project-create"
      data-dirty={isDirty ? "true" : "false"}
      onSubmit={(event) => event.preventDefault()}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <input type="hidden" name="orderIndex" value={orderIndex} />
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1 text-base text-slate-600">
          <span className="text-base text-slate-500">プロジェクト</span>
          <input
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-72 rounded-md border border-slate-200 px-3 py-2 text-base"
          />
        </div>
        <div className="flex flex-col gap-1 text-base text-slate-600">
          <span className="text-base text-slate-500">ユニット</span>
          <select
            name="unitId"
            disabled={units.length === 0}
            value={unitId}
            onChange={(event) => setUnitId(event.target.value)}
            className="w-44 rounded-md border border-slate-200 px-3 py-2 text-base"
          >
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-base text-transparent">placeholder</span>
          <button
            type="button"
            onClick={handleRemove}
            className="rounded-md bg-rose-600 px-3 py-2 text-base font-medium text-white"
          >
            削除
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
        <div className="text-base font-semibold text-slate-600">開発項目</div>
        <div className="mt-3 space-y-3">
          {items.map((item, index) => (
            <div key={item.id} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="itemOrderIndex" value={index} />
              <div className="flex flex-col gap-1 text-base text-slate-600">
                <span className="text-base text-slate-500">開発項目</span>
                <input
                  name="itemName"
                  placeholder="新しい開発項目"
                  value={item.name}
                  onChange={(event) => updateItem(item.id, "name", event.target.value)}
                  className="w-72 rounded-md border border-slate-200 px-3 py-2 text-base"
                />
              </div>
              <div className="flex flex-col gap-1 text-base text-slate-600">
                <span className="text-base text-slate-500">種類</span>
                <input
                  name="itemType"
                  placeholder="種類(任意)"
                  value={item.type}
                  onChange={(event) => updateItem(item.id, "type", event.target.value)}
                  className="w-48 rounded-md border border-slate-200 px-3 py-2 text-base"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-base text-transparent">placeholder</span>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="rounded-md bg-rose-600 px-3 py-2 text-base font-medium text-white"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-base text-transparent">placeholder</span>
            <button
              type="button"
              onClick={addItem}
              className="rounded-md bg-slate-900 px-3 py-2 text-base font-medium text-white"
            >
              項目を追加
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
