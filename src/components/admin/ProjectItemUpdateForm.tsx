"use client";

import { useEffect, useMemo, useState } from "react";

type ProjectItemUpdateFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  item: {
    id: string;
    name: string;
    type: string | null;
  };
};

export default function ProjectItemUpdateForm({
  action,
  item
}: ProjectItemUpdateFormProps) {
  const [name, setName] = useState(item.name);
  const [type, setType] = useState(item.type ?? "");

  useEffect(() => {
    setName(item.name);
  }, [item.name]);

  useEffect(() => {
    setType(item.type ?? "");
  }, [item.type]);

  useEffect(() => {
    const handler = () => {
      setName(item.name);
      setType(item.type ?? "");
    };
    window.addEventListener("wm:bulk-reset", handler);
    return () => {
      window.removeEventListener("wm:bulk-reset", handler);
    };
  }, [item.name, item.type]);

  const isDirty = useMemo(() => {
    return name.trim() !== item.name || (type || "") !== (item.type ?? "");
  }, [item.name, item.type, name, type]);

  useEffect(() => {
    window.dispatchEvent(new Event("wm:dirty-change"));
  }, [isDirty]);

  return (
    <form
      action={action}
      data-kind="item-update"
      data-dirty={isDirty ? "true" : "false"}
      onSubmit={(event) => event.preventDefault()}
      className="flex flex-wrap items-end gap-2"
    >
      <input type="hidden" name="itemId" value={item.id} />
      <div className="flex flex-col gap-1 text-base text-slate-600">
        <span className="text-base text-slate-500">開発項目</span>
        <input
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-72 rounded-md border border-slate-200 px-3 py-2 text-base"
        />
      </div>
      <div className="flex flex-col gap-1 text-base text-slate-600">
        <span className="text-base text-slate-500">種類</span>
        <input
          name="type"
          placeholder="種類(任意)"
          value={type}
          onChange={(event) => setType(event.target.value)}
          className="w-48 rounded-md border border-slate-200 px-3 py-2 text-base"
        />
      </div>
      <input type="hidden" name="dirty" value={isDirty ? "1" : ""} />
    </form>
  );
}
