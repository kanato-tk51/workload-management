"use client";

import { useEffect, useState } from "react";

import ProjectItemDraftList from "@/components/admin/ProjectItemDraftList";
import ProjectItemRow from "@/components/admin/ProjectItemRow";
import ProjectUpdateForm from "@/components/admin/ProjectUpdateForm";

type UnitOption = {
  id: string;
  name: string;
};

type ProjectRowProps = {
  project: {
    id: string;
    name: string;
    unitId: string | null;
    items: Array<{ id: string; name: string; type: string | null }>;
  };
  units: UnitOption[];
  actions: {
    updateProject: (formData: FormData) => void | Promise<void>;
    deleteProject: (formData: FormData) => void | Promise<void>;
    addItem: (formData: FormData) => void | Promise<void>;
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

export default function ProjectRow({ project, units, actions, move }: ProjectRowProps) {
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
      <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-base font-semibold text-rose-700">削除予定</div>
          <div className="text-base text-slate-700">{project.name}</div>
          <button
            type="button"
            onClick={() => setPendingDelete(false)}
            className="rounded-md border border-slate-300 px-3 py-2 text-base font-medium text-slate-700"
          >
            取り消し
          </button>
        </div>
        <form
          action={actions.deleteProject}
          data-kind="project-delete"
          data-dirty="true"
          onSubmit={(event) => event.preventDefault()}
          className="hidden"
        >
          <input type="hidden" name="projectId" value={project.id} />
        </form>
      </div>
    );
  }

  return (
    <details
      data-details="admin-project"
      open
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <summary className="flex cursor-pointer flex-wrap items-end gap-2">
        <ProjectUpdateForm
          action={actions.updateProject}
          project={{
            id: project.id,
            name: project.name,
            unitId: project.unitId
          }}
          units={units}
        />
        <div className="flex flex-col gap-1">
          <span className="text-base text-transparent">placeholder</span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setPendingDelete(true);
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
                onClick={(event) => {
                  event.stopPropagation();
                  move.onMoveUp();
                }}
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
                onClick={(event) => {
                  event.stopPropagation();
                  move.onMoveDown();
                }}
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
      </summary>

      <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
        <div className="text-base font-semibold text-slate-600">開発項目</div>
        <div className="mt-3 space-y-3">
          {project.items.length === 0 && (
            <div className="text-base text-slate-500">項目がありません。</div>
          )}
          {project.items.map((item) => (
            <ProjectItemRow
              key={item.id}
              item={item}
              actions={{
                updateItem: actions.updateItem,
                deleteItem: actions.deleteItem
              }}
            />
          ))}
        </div>

        <ProjectItemDraftList action={actions.addItem} projectId={project.id} />
      </div>
    </details>
  );
}
