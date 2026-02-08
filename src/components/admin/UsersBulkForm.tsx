"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

type UnitOption = {
  id: string;
  name: string;
};

type UserRow = {
  id: string;
  email: string;
  displayName: string | null;
  unitId: string | null;
  isAdmin: boolean;
};

type UsersBulkFormProps = {
  users: UserRow[];
  units: UnitOption[];
  action: (formData: FormData) => void | Promise<void>;
};

function SaveResetButtons({
  disabled,
  onReset
}: {
  disabled: boolean;
  onReset: () => void;
}) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <div className="flex items-center gap-2">
      <button
        className={`rounded-md px-4 py-2 text-xs font-medium ${
          isDisabled
            ? "cursor-not-allowed bg-slate-200 text-slate-500"
            : "bg-slate-900 text-white"
        }`}
        type="submit"
        disabled={isDisabled}
      >
        {pending ? "保存中..." : "変更を保存"}
      </button>
      <button
        className={`rounded-md px-4 py-2 text-xs font-medium ${
          isDisabled
            ? "cursor-not-allowed bg-slate-200 text-slate-500"
            : "border border-rose-300 text-rose-700"
        }`}
        type="button"
        disabled={isDisabled}
        onClick={onReset}
      >
        リセット
      </button>
    </div>
  );
}

export default function UsersBulkForm({ users, units, action }: UsersBulkFormProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [hasDirty, setHasDirty] = useState(false);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const initialMap = useMemo(() => {
    return users.map((user) => ({
      id: user.id,
      displayName: user.displayName ?? "",
      unitId: user.unitId ?? "",
      isAdmin: user.isAdmin
    }));
  }, [users]);

  const checkDirty = useCallback(() => {
    const form = formRef.current;
    if (!form) return;
    let dirty = false;
    for (const user of initialMap) {
      if (deletedIds.has(user.id)) {
        dirty = true;
        break;
      }
      const nameInput = form.elements.namedItem(
        `displayName:${user.id}`
      ) as HTMLInputElement | null;
      const nameValue = nameInput?.value ?? "";
      if (nameValue !== user.displayName) {
        dirty = true;
        break;
      }
      const unitSelect = form.elements.namedItem(
        `unitId:${user.id}`
      ) as HTMLSelectElement | null;
      const unitValue = unitSelect?.value ?? "";
      if (unitValue !== user.unitId) {
        dirty = true;
        break;
      }
      const adminInput = form.elements.namedItem(
        `isAdmin:${user.id}`
      ) as HTMLInputElement | null;
      const adminValue = adminInput?.checked ?? false;
      if (adminValue !== user.isAdmin) {
        dirty = true;
        break;
      }
    }
    setHasDirty(dirty);
  }, [deletedIds, initialMap]);

  useEffect(() => {
    setHasDirty(false);
    setDeletedIds(new Set());
  }, [users]);

  useEffect(() => {
    checkDirty();
  }, [deletedIds, checkDirty]);

  const handleReset = useCallback(() => {
    if (!formRef.current) return;
    formRef.current.reset();
    setDeletedIds(new Set());
    checkDirty();
  }, [checkDirty]);

  const toggleDelete = useCallback((id: string) => {
    setDeletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <form
      ref={formRef}
      action={action}
      onChange={checkDirty}
      className="rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex items-center justify-end border-b border-slate-200 px-6 py-3">
        <SaveResetButtons disabled={!hasDirty} onReset={handleReset} />
      </div>
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-3 text-xs font-semibold text-slate-500">
        <div className="grid gap-3 md:grid-cols-[2.8fr_2fr_1.2fr_0.8fr_0.8fr]">
          <div>メール</div>
          <div>氏名</div>
          <div>ユニット</div>
          <div>管理者</div>
          <div>削除</div>
        </div>
      </div>
      {users.map((user) => (
        <div
          key={user.id}
          className={`grid items-center gap-3 border-t border-slate-200 px-6 py-4 md:grid-cols-[2.8fr_2fr_1.2fr_0.8fr_0.8fr] ${
            deletedIds.has(user.id) ? "bg-rose-50" : ""
          }`}
        >
          <input type="hidden" name="userId" value={user.id} />
          <input type="hidden" name={`email:${user.id}`} value={user.email} />
          {deletedIds.has(user.id) && (
            <input type="hidden" name={`delete:${user.id}`} value="1" />
          )}
          <div className="text-xs text-slate-500">{user.email}</div>
          <div>
            <input
              name={`displayName:${user.id}`}
              defaultValue={user.displayName ?? ""}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              placeholder="未登録"
              required
              disabled={deletedIds.has(user.id)}
            />
          </div>
          <div>
            <select
              name={`unitId:${user.id}`}
              defaultValue={user.unitId ?? ""}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              disabled={deletedIds.has(user.id)}
            >
              <option value="">未設定</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                name={`isAdmin:${user.id}`}
                defaultChecked={user.isAdmin}
                disabled={deletedIds.has(user.id)}
              />
              管理者
            </label>
          </div>
          <div>
            <button
              type="button"
              onClick={() => toggleDelete(user.id)}
              className={`rounded-md px-3 py-2 text-xs font-medium ${
                deletedIds.has(user.id)
                  ? "border border-slate-300 text-slate-600"
                  : "bg-rose-600 text-white"
              }`}
            >
              {deletedIds.has(user.id) ? "取り消し" : "削除"}
            </button>
          </div>
        </div>
      ))}
    </form>
  );
}
