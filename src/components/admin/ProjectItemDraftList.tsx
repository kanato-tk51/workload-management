"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type DraftItem = {
  id: number;
  name: string;
  type: string;
};

type ProjectItemDraftListProps = {
  action: (formData: FormData) => void | Promise<void>;
  projectId: string;
};

export default function ProjectItemDraftList({
  action,
  projectId
}: ProjectItemDraftListProps) {
  const [drafts, setDrafts] = useState<DraftItem[]>([
    { id: 0, name: "", type: "" }
  ]);
  const [nextId, setNextId] = useState(1);

  const addDraft = useCallback(() => {
    setDrafts((prev) => [...prev, { id: nextId, name: "", type: "" }]);
    setNextId((prev) => prev + 1);
  }, [nextId]);

  const removeDraft = useCallback((id: number) => {
    setDrafts((prev) => prev.filter((draft) => draft.id !== id));
  }, []);

  const updateDraft = useCallback((id: number, field: "name" | "type", value: string) => {
    setDrafts((prev) =>
      prev.map((draft) =>
        draft.id === id
          ? { ...draft, [field]: value }
          : draft
      )
    );
  }, []);

  const dirtyCount = useMemo(
    () => drafts.filter((draft) => draft.name.trim().length > 0).length,
    [drafts]
  );

  useEffect(() => {
    window.dispatchEvent(new Event("wm:dirty-change"));
  }, [dirtyCount]);

  useEffect(() => {
    const handler = () => {
      setDrafts([{ id: 0, name: "", type: "" }]);
      setNextId(1);
    };
    window.addEventListener("wm:bulk-reset", handler);
    return () => {
      window.removeEventListener("wm:bulk-reset", handler);
    };
  }, []);

  return (
    <div className="mt-4 space-y-3">
      {drafts.map((draft, index) => {
        const shouldSubmit = draft.name.trim().length > 0;
          return (
            <form
              key={draft.id}
              action={action}
              className="flex flex-wrap items-end gap-2"
              data-kind="item-create"
              data-dirty={shouldSubmit ? "true" : "false"}
              onSubmit={(event) => event.preventDefault()}
            >
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="orderIndex" value={index} />
            <div className="flex flex-col gap-1 text-base text-slate-600">
              <span className="text-base text-slate-500">開発項目</span>
              <input
                name="name"
                placeholder="新しい開発項目"
                value={draft.name}
                onChange={(event) => updateDraft(draft.id, "name", event.target.value)}
                className="w-72 rounded-md border border-slate-200 px-3 py-2 text-base"
              />
            </div>
            <div className="flex flex-col gap-1 text-base text-slate-600">
              <span className="text-base text-slate-500">種類</span>
              <input
                name="type"
                placeholder="種類(任意)"
                value={draft.type}
                onChange={(event) => updateDraft(draft.id, "type", event.target.value)}
                className="w-48 rounded-md border border-slate-200 px-3 py-2 text-base"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-base text-transparent">placeholder</span>
              <button
                type="button"
                onClick={() => removeDraft(draft.id)}
                className="rounded-md bg-rose-600 px-3 py-2 text-base font-medium text-white"
              >
                削除
              </button>
            </div>
          </form>
        );
      })}
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-base text-transparent">placeholder</span>
          <button
            type="button"
            onClick={addDraft}
            className="rounded-md bg-slate-900 px-3 py-2 text-base font-medium text-white"
          >
            項目を追加
          </button>
        </div>
      </div>
    </div>
  );
}
