"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ProjectDraftList from "@/components/admin/ProjectDraftList";
import ProjectRow from "@/components/admin/ProjectRow";

type UnitOption = {
  id: string;
  name: string;
};

type ProjectItem = {
  id: string;
  name: string;
  type: string | null;
};

type ProjectData = {
  id: string;
  name: string;
  unitId: string | null;
  items: ProjectItem[];
};

type ProjectUnitListProps = {
  unitId: string;
  units: UnitOption[];
  projects: ProjectData[];
  actions: {
    createProjectWithItems: (formData: FormData) => void | Promise<void>;
    updateProjectOrder: (formData: FormData) => void | Promise<void>;
    updateProject: (formData: FormData) => void | Promise<void>;
    deleteProject: (formData: FormData) => void | Promise<void>;
    addItem: (formData: FormData) => void | Promise<void>;
    updateItem: (formData: FormData) => void | Promise<void>;
    deleteItem: (formData: FormData) => void | Promise<void>;
  };
};

function moveProject(list: ProjectData[], fromIndex: number, toIndex: number) {
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return list;
  if (fromIndex >= list.length || toIndex >= list.length) return list;
  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export default function ProjectUnitList({ unitId, units, projects, actions }: ProjectUnitListProps) {
  const [orderedProjects, setOrderedProjects] = useState<ProjectData[]>(projects);
  const [orderDirty, setOrderDirty] = useState(false);
  const initialOrderRef = useRef(projects.map((project) => project.id).join(","));

  useEffect(() => {
    setOrderedProjects(projects);
    setOrderDirty(false);
    initialOrderRef.current = projects.map((project) => project.id).join(",");
  }, [projects]);

  useEffect(() => {
    const handler = () => {
      setOrderedProjects(projects);
      setOrderDirty(false);
      initialOrderRef.current = projects.map((project) => project.id).join(",");
      window.dispatchEvent(new Event("wm:dirty-change"));
    };
    window.addEventListener("wm:bulk-reset", handler);
    return () => {
      window.removeEventListener("wm:bulk-reset", handler);
    };
  }, [projects]);

  const moveBy = useCallback(
    (index: number, delta: number) => {
      setOrderedProjects((prev) => {
        const nextIndex = index + delta;
        return moveProject(prev, index, nextIndex);
      });
    },
    []
  );

  useEffect(() => {
    const orderKey = orderedProjects.map((project) => project.id).join(",");
    const dirty = orderKey !== initialOrderRef.current;
    setOrderDirty((prev) => (prev === dirty ? prev : dirty));
    window.dispatchEvent(new Event("wm:dirty-change"));
  }, [orderedProjects]);

  const projectOrderIds = useMemo(() => orderedProjects.map((project) => project.id), [orderedProjects]);

  return (
    <div className="space-y-4">
      <ProjectDraftList action={actions.createProjectWithItems} unitId={unitId} units={units} />

      {orderedProjects.length === 0 && (
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-base text-slate-500">
          プロジェクトがありません。
        </div>
      )}

      <form
        action={actions.updateProjectOrder}
        data-dirty={orderDirty ? "true" : "false"}
        data-kind="order-update"
        className="hidden"
        onSubmit={(event) => event.preventDefault()}
      >
        <input type="hidden" name="unitId" value={unitId} />
        {projectOrderIds.map((projectId) => (
          <input key={projectId} type="hidden" name="projectId" value={projectId} />
        ))}
      </form>

      {orderedProjects.map((project, index) => (
        <ProjectRow
          key={project.id}
          project={project}
          units={units}
          actions={{
            updateProject: actions.updateProject,
            deleteProject: actions.deleteProject,
            addItem: actions.addItem,
            updateItem: actions.updateItem,
            deleteItem: actions.deleteItem
          }}
          move={{
            canMoveUp: index > 0,
            canMoveDown: index < orderedProjects.length - 1,
            onMoveUp: () => moveBy(index, -1),
            onMoveDown: () => moveBy(index, 1)
          }}
        />
      ))}
    </div>
  );
}
