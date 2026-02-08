"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import ProjectDraftRow from "@/components/admin/ProjectDraftRow";

type UnitOption = {
  id: string;
  name: string;
};

type DraftProject = {
  id: number;
  name: string;
  unitId: string;
};

type ProjectDraftListProps = {
  action: (formData: FormData) => void | Promise<void>;
  unitId: string;
  units: UnitOption[];
};

export default function ProjectDraftList({ action, unitId, units }: ProjectDraftListProps) {
  const [drafts, setDrafts] = useState<DraftProject[]>([]);
  const [nextId, setNextId] = useState(1);
  const [newName, setNewName] = useState("");

  const trimmedName = newName.trim();
  const canAdd = trimmedName.length > 0;

  const addDraft = useCallback(() => {
    if (!canAdd) return;
    setDrafts((prev) => [{ id: nextId, name: trimmedName, unitId }, ...prev]);
    setNextId((prev) => prev + 1);
    setNewName("");
  }, [canAdd, nextId, trimmedName, unitId]);

  const removeDraft = useCallback((id: number) => {
    setDrafts((prev) => prev.filter((draft) => draft.id !== id));
  }, []);

  const dirtyCount = useMemo(() => drafts.length, [drafts.length]);

  useEffect(() => {
    window.dispatchEvent(new Event("wm:dirty-change"));
  }, [dirtyCount]);

  useEffect(() => {
    const handler = () => {
      setDrafts([]);
      setNewName("");
      setNextId(1);
    };
    window.addEventListener("wm:bulk-save-complete", handler);
    window.addEventListener("wm:bulk-reset", handler);
    return () => {
      window.removeEventListener("wm:bulk-save-complete", handler);
      window.removeEventListener("wm:bulk-reset", handler);
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
        <div className="text-base font-semibold text-slate-600">プロジェクト</div>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1 text-base text-slate-600">
            <span className="text-base text-slate-500">プロジェクト</span>
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="プロジェクト名"
              className="w-72 rounded-md border border-slate-200 px-3 py-2 text-base"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-base text-transparent">placeholder</span>
            <button
              type="button"
              onClick={addDraft}
              disabled={!canAdd}
              className={`rounded-md px-3 py-2 text-base font-medium ${
                canAdd
                  ? "bg-slate-900 text-white"
                  : "cursor-not-allowed bg-slate-200 text-slate-500"
              }`}
            >
              プロジェクトを追加
            </button>
          </div>
        </div>
      </div>

      {drafts.length > 0 &&
        drafts.map((draft, index) => (
          <ProjectDraftRow
            key={draft.id}
            draft={draft}
            units={units}
            orderIndex={index}
            action={action}
            onRemove={removeDraft}
          />
        ))}
    </div>
  );
}
