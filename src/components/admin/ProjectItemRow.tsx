"use client";

import { useEffect, useState } from "react";

import ProjectItemUpdateForm from "@/components/admin/ProjectItemUpdateForm";

type ProjectItemRowProps = {
  item: {
    id: string;
    name: string;
    type: string | null;
  };
  actions: {
    updateItem: (formData: FormData) => void | Promise<void>;
    deleteItem: (formData: FormData) => void | Promise<void>;
  };
  move?: {
    canMoveUp: boolean;
    canMoveDown: boolean;
    onMoveUp: () => void;
    onMoveDown: () => void;
  };
};

export default function ProjectItemRow({ item, actions, move }: ProjectItemRowProps) {
  const [pendingDelete, setPendingDelete] = useState(false);

  useEffect(() => {
    window.dispatchEvent(new Event("wm:dirty-change"));
  }, [pendingDelete]);

  useEffect(() => {
    const handler = () => {
      setPendingDelete(false);
    };
    window.addEventListener("wm:bulk-reset", handler);
    return () => {
      window.removeEventListener("wm:bulk-reset", handler);
    };
  }, []);

  if (pendingDelete) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
        <div className="text-base font-semibold text-rose-700">削除予定</div>
        <div className="text-base text-slate-700">{item.name}</div>
        <button
          type="button"
          onClick={() => setPendingDelete(false)}
          className="rounded-md border border-slate-300 px-3 py-2 text-base font-medium text-slate-700"
        >
          取り消し
        </button>
        <form
          action={actions.deleteItem}
          data-kind="item-delete"
          data-dirty="true"
          onSubmit={(event) => event.preventDefault()}
          className="hidden"
        >
          <input type="hidden" name="itemId" value={item.id} />
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <ProjectItemUpdateForm action={actions.updateItem} item={item} />
      <div className="flex flex-col gap-1">
        <span className="text-base text-transparent">placeholder</span>
        <button
          type="button"
          onClick={() => {
            if (confirm("この開発項目を削除しますか？")) {
              setPendingDelete(true);
            }
          }}
          className="rounded-md bg-rose-600 px-3 py-2 text-base font-medium text-white"
        >
          削除
        </button>
      </div>
      {move && (
        <div className="ml-auto flex flex-col gap-1">
          <span className="text-base text-transparent">placeholder</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={move.onMoveUp}
              disabled={!move.canMoveUp}
              className={`rounded-md px-3 py-2 text-base font-medium ${
                !move.canMoveUp
                  ? "cursor-not-allowed bg-slate-200 text-slate-400"
                  : "border border-slate-300 bg-white text-slate-700"
              }`}
            >
              ↑
            </button>
            <button
              type="button"
              onClick={move.onMoveDown}
              disabled={!move.canMoveDown}
              className={`rounded-md px-3 py-2 text-base font-medium ${
                !move.canMoveDown
                  ? "cursor-not-allowed bg-slate-200 text-slate-400"
                  : "border border-slate-300 bg-white text-slate-700"
              }`}
            >
              ↓
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
