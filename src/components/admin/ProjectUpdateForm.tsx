"use client";

import { useEffect, useMemo, useState } from "react";

type UnitOption = {
  id: string;
  name: string;
};

type ProjectUpdateFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  project: {
    id: string;
    name: string;
    unitId: string | null;
  };
  units: UnitOption[];
};

export default function ProjectUpdateForm({ action, project, units }: ProjectUpdateFormProps) {
  const [name, setName] = useState(project.name);
  const [unitId, setUnitId] = useState(project.unitId ?? "");

  useEffect(() => {
    setName(project.name);
  }, [project.name]);

  useEffect(() => {
    setUnitId(project.unitId ?? "");
  }, [project.unitId]);

  useEffect(() => {
    const handler = () => {
      setName(project.name);
      setUnitId(project.unitId ?? "");
    };
    window.addEventListener("wm:bulk-reset", handler);
    return () => {
      window.removeEventListener("wm:bulk-reset", handler);
    };
  }, [project.name, project.unitId]);

  const isDirty = useMemo(() => {
    return (
      name.trim() !== project.name ||
      (unitId || "") !== (project.unitId ?? "")
    );
  }, [name, project.name, project.unitId, unitId]);

  useEffect(() => {
    window.dispatchEvent(new Event("wm:dirty-change"));
  }, [isDirty]);

  return (
    <form
      action={action}
      data-kind="project-update"
      data-dirty={isDirty ? "true" : "false"}
      onSubmit={(event) => event.preventDefault()}
      className="flex flex-wrap items-end gap-2"
    >
      <input type="hidden" name="projectId" value={project.id} />
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
          required
          disabled={units.length === 0}
          value={unitId}
          onChange={(event) => setUnitId(event.target.value)}
          className="w-44 rounded-md border border-slate-200 px-3 py-2 text-base"
        >
          <option value="" disabled>
            {units.length === 0 ? "ユニット未登録" : "ユニットを選択"}
          </option>
          {units.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name}
            </option>
          ))}
        </select>
      </div>
      <input type="hidden" name="dirty" value={isDirty ? "1" : ""} />
    </form>
  );
}
