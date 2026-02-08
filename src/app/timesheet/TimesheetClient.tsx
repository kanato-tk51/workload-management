"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DataGrid, renderTextEditor, type Column } from "react-data-grid";
import "react-data-grid/lib/styles.css";

const DRAFT_KEY_PREFIX = "wm.draft.";

type Item = {
  id: string;
  projectName: string;
  itemName: string;
  type: string | null;
};

type Entry = {
  date: string;
  projectItemId: string;
  value: number;
};

type MonthResponse = {
  month: string;
  days: number;
  items: Item[];
  entries: Entry[];
  holidays: string[];
  personalHolidays: string[];
};

type Row = {
  id: string;
  project: string;
  projectKey: string;
  item: string;
  type: string;
  [key: string]: string | number;
};

function sanitizeInput(value: unknown) {
  if (value === null || value === undefined) return "";
  const trimmed = String(value).trim();
  if (trimmed.length === 0) return "";
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) return "";
  const clamped = Math.max(0, Math.min(100, Math.round(numeric * 10) / 10));
  return clamped === 0 ? "" : clamped.toString();
}

export default function TimesheetClient({
  initialMonth,
  readOnly = false,
  dataEndpoint = "/api/month",
  userId
}: {
  initialMonth: string;
  readOnly?: boolean;
  dataEndpoint?: string;
  userId?: string;
}) {
  const [month, setMonth] = useState(initialMonth);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MonthResponse | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [invalidWarning, setInvalidWarning] = useState(false);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [selectedHolidays, setSelectedHolidays] = useState<Set<string>>(new Set());

  const fetchMonth = useCallback(
    async (value: string) => {
      const params = new URLSearchParams({ month: value });
      if (userId) {
        params.set("userId", userId);
      }
      setLoading(true);
      setMessage(null);
      setInvalidWarning(false);
      const res = await fetch(`${dataEndpoint}?${params.toString()}`, {
        cache: "no-store"
      });
      if (!res.ok) {
        setMessage("データ取得に失敗しました。");
        setLoading(false);
        return;
      }
      const json: MonthResponse = await res.json();
      setData(json);
      setLoading(false);
    },
    [dataEndpoint, userId]
  );

  useEffect(() => {
    fetchMonth(month);
  }, [fetchMonth, month]);

  useEffect(() => {
    if (!data) return;
    setSelectedHolidays(new Set(data.personalHolidays));
  }, [data]);

  const draftKey = `${DRAFT_KEY_PREFIX}${month}`;

  const loadDrafts = useCallback(() => {
    if (readOnly || typeof window === "undefined") {
      return {} as Record<string, Record<string, number>>;
    }
    const raw = localStorage.getItem(draftKey);
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, Record<string, number>>;
    } catch {
      return {};
    }
  }, [draftKey, readOnly]);

  useEffect(() => {
    if (!data) return;
    const entryMap = new Map<string, number>();
    data.entries.forEach((entry) => {
      entryMap.set(`${entry.date}:${entry.projectItemId}`, entry.value);
    });
    const drafts = loadDrafts();

    const newRows: Row[] = [];
    let lastProjectName = "";
    data.items.forEach((item) => {
      const isSameProject = item.projectName === lastProjectName;
      const projectLabel = isSameProject ? "" : item.projectName;
      lastProjectName = item.projectName;
      const row: Row = {
        id: item.id,
        project: projectLabel,
        projectKey: item.projectName,
        item: item.itemName,
        type: item.type ?? ""
      };

      for (let day = 1; day <= data.days; day += 1) {
        const date = `${data.month}-${day.toString().padStart(2, "0")}`;
        const draft = drafts[date]?.[item.id];
        const value =
          draft !== undefined
            ? draft
            : entryMap.get(`${date}:${item.id}`) ?? 0;
        row[`d${day}`] = value === 0 ? "" : value.toString();
      }
      newRows.push(row);
    });
    setRows(newRows);
  }, [data, loadDrafts]);

  const dayTotals = useMemo(() => {
    if (!data) return {} as Record<string, number>;
    const totals: Record<string, number> = {};
    for (let day = 1; day <= data.days; day += 1) {
      const key = `d${day}`;
      const total = rows.reduce((sum, row) => sum + Number(row[key] || 0), 0);
      totals[key] = Math.round(total * 10) / 10;
    }
    return totals;
  }, [data, rows]);

  const baseHolidays = useMemo(() => new Set(data?.holidays ?? []), [data?.holidays]);
  const holidays = useMemo(() => {
    const base = new Set(baseHolidays);
    selectedHolidays.forEach((date) => base.add(date));
    return base;
  }, [baseHolidays, selectedHolidays]);

  const holidayDirty = useMemo(() => {
    if (!data) return false;
    const current = selectedHolidays;
    const initial = new Set(data.personalHolidays);
    if (current.size !== initial.size) return true;
    for (const date of current) {
      if (!initial.has(date)) return true;
    }
    return false;
  }, [data, selectedHolidays]);

  const incompleteDays = useMemo(() => {
    if (!data) return [] as number[];
    const result: number[] = [];
    for (let day = 1; day <= data.days; day += 1) {
      const key = `d${day}`;
      const date = `${data.month}-${day.toString().padStart(2, "0")}`;
      let total = 0;
      rows.forEach((row) => {
        total += Number(row[key] || 0);
      });
      total = Math.round(total * 10) / 10;
      const isHoliday = holidays.has(date);
      const isComplete = isHoliday ? total === 0 || total === 100 : total === 100;
      if (!isComplete) {
        result.push(day);
      }
    }
    return result;
  }, [data, holidays, rows]);

  const incompleteSet = useMemo(() => new Set(incompleteDays), [incompleteDays]);

  const calendar = useMemo(() => {
    if (!data) return { weeks: [] as Array<Array<number | null>> };
    const [year, monthValue] = data.month.split("-").map(Number);
    const firstDow = new Date(Date.UTC(year, monthValue - 1, 1)).getUTCDay();
    const weeks: Array<Array<number | null>> = [];
    let week: Array<number | null> = Array.from({ length: firstDow }, () => null);
    for (let day = 1; day <= data.days; day += 1) {
      week.push(day);
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      weeks.push(week);
    }
    return { weeks };
  }, [data]);

  const isDirty = useMemo(() => {
    if (readOnly) return false;
    if (!data) return false;
    const savedMap = new Map<string, number>();
    data.entries.forEach((entry) => {
      savedMap.set(`${entry.date}:${entry.projectItemId}`, Number(entry.value));
    });
    for (let day = 1; day <= data.days; day += 1) {
      const date = `${data.month}-${day.toString().padStart(2, "0")}`;
      for (const row of rows) {
        const current = Number(row[`d${day}`] || 0);
        const saved = savedMap.get(`${date}:${row.id}`) ?? 0;
        if (Math.round(current * 10) / 10 !== Math.round(saved * 10) / 10) {
          return true;
        }
      }
    }
    return false;
  }, [data, readOnly, rows]);
  const hasUnsaved = isDirty || holidayDirty;
  const canSave = hasUnsaved && !saving && !loading;

  const columns = useMemo(() => {
    if (!data) return [] as Column<Row>[];
    const [year, monthValue] = data.month.split("-").map(Number);
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    const dayColumns: Column<Row>[] = Array.from({ length: data.days }, (_, index) => {
      const day = index + 1;
      const key = `d${day}`;
      const date = `${data.month}-${day.toString().padStart(2, "0")}`;
      const dow = new Date(Date.UTC(year, monthValue - 1, day)).getUTCDay();
      const weekday = weekdays[dow] ?? "";
      const isHoliday = holidays.has(date);
      const isIncomplete = readOnly && incompleteSet.has(day);
      const headerClass = [
        isHoliday ? "bg-rose-50" : "",
        isIncomplete ? "bg-rose-100" : ""
      ]
        .filter(Boolean)
        .join(" ");
      return {
        key,
        name: `${day}`,
        editable: !readOnly,
        width: 56,
        headerClass: headerClass || undefined,
        cellClass: isIncomplete ? "bg-rose-50" : undefined,
        renderEditCell: readOnly ? undefined : renderTextEditor,
        renderHeaderCell() {
          const total = dayTotals[key] ?? 0;
          const needs = total === 100 ? "" : "*";
          const status = isHoliday ? "休" : "";
          return (
            <div className="flex flex-col items-center text-[0.6rem]">
              <span className={isHoliday ? "text-rose-600" : ""}>{day}</span>
              <span className={isHoliday ? "text-rose-600" : ""}>{weekday}</span>
              <div className="flex items-center gap-1 text-[8px]">
                <span className="text-slate-500">
                  {total === 0 ? "" : total}
                  {needs}
                </span>
                {status && <span className="text-rose-600">休</span>}
              </div>
            </div>
          );
        }
      };
    });

    return [
      { key: "project", name: "プロジェクト", width: 160, frozen: true },
      { key: "item", name: "開発項目", width: 180, frozen: true },
      { key: "type", name: "種類", width: 120 },
      ...dayColumns,
      {
        key: "sum",
        name: "合計",
        width: 80,
        renderCell({ row }) {
          let total = 0;
          for (let day = 1; day <= data.days; day += 1) {
            total += Number(row[`d${day}`] || 0);
          }
          return <span className="text-[0.6rem]">{Math.round(total * 10) / 10}</span>;
        }
      }
    ];
  }, [data, dayTotals, holidays, readOnly]);

  const baseRowHeight = 40;
  const extraLineHeight = 16;
  const headerRowHeight = 56;
  const projectColWidth = 160;
  const itemColWidth = 180;
  const typeColWidth = 120;
  const avgCharWidth = 12;

  const estimateLines = useCallback(
    (text: string, colWidth: number) => {
      if (!text) return 1;
      const charsPerLine = Math.max(1, Math.floor(colWidth / avgCharWidth));
      return Math.max(1, Math.ceil(text.length / charsPerLine));
    },
    [avgCharWidth]
  );

  const rowHeights = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((row) => {
      const projectLines = estimateLines(row.project, projectColWidth);
      const itemLines = estimateLines(row.item, itemColWidth);
      const typeLines = estimateLines(String(row.type || ""), typeColWidth);
      const maxLines = Math.max(1, projectLines, itemLines, typeLines);
      const height = baseRowHeight + (maxLines - 1) * extraLineHeight;
      map.set(row.id, height);
    });
    return map;
  }, [
    baseRowHeight,
    estimateLines,
    extraLineHeight,
    itemColWidth,
    projectColWidth,
    rows,
    typeColWidth
  ]);

  const getRowHeight = useCallback(
    (row: Row) => rowHeights.get(row.id) ?? baseRowHeight,
    [baseRowHeight, rowHeights]
  );

  const gridHeight = useMemo(() => {
    if (!data) return 0;
    let total = 0;
    rows.forEach((row) => {
      total += rowHeights.get(row.id) ?? baseRowHeight;
    });
    return total + 2;
  }, [baseRowHeight, data, rowHeights, rows]);

  const headerCells = useMemo(() => {
    return columns.map((column) => {
      const renderHeader =
        "renderHeaderCell" in column ? column.renderHeaderCell : undefined;
      const content = renderHeader
        ? renderHeader({
            column,
            sortDirection: undefined,
            priority: undefined
          } as unknown as Parameters<NonNullable<typeof renderHeader>>[0])
        : column.name;
      const isFrozen = "frozen" in column ? Boolean(column.frozen) : false;
      return {
        key: String(column.key),
        width: typeof column.width === "number" ? column.width : 100,
        frozen: isFrozen,
        content
      };
    });
  }, [columns]);

  const frozenHeaders = useMemo(
    () => headerCells.filter((cell) => cell.frozen),
    [headerCells]
  );
  const scrollHeaders = useMemo(
    () => headerCells.filter((cell) => !cell.frozen),
    [headerCells]
  );
  const frozenWidth = useMemo(
    () => frozenHeaders.reduce((sum, cell) => sum + cell.width, 0),
    [frozenHeaders]
  );
  const scrollWidth = useMemo(
    () => scrollHeaders.reduce((sum, cell) => sum + cell.width, 0),
    [scrollHeaders]
  );
  const rowClass = useCallback(
    (row: Row, rowIdx: number) => {
      if (rowIdx === 0) return undefined;
      const prev = rows[rowIdx - 1];
      if (!prev) return undefined;
      return prev.projectKey !== row.projectKey ? "timesheet-project-divider" : undefined;
    },
    [rows]
  );

  const handleGridScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollLeft(event.currentTarget.scrollLeft);
  }, []);

  const toggleHoliday = useCallback(
    (date: string) => {
      if (readOnly) return;
      setSelectedHolidays((prev) => {
        if (baseHolidays.has(date)) {
          return prev;
        }
        const next = new Set(prev);
        if (next.has(date)) {
          next.delete(date);
        } else {
          next.add(date);
        }
        return next;
      });
    },
    [baseHolidays, readOnly]
  );

  const updateDraft = useCallback(
    (date: string, entries: Record<string, number>, shouldClear: boolean) => {
      if (readOnly || typeof window === "undefined") return;
      const current = loadDrafts();
      if (shouldClear) {
        delete current[date];
      } else {
        current[date] = entries;
      }
      localStorage.setItem(draftKey, JSON.stringify(current));
    },
    [draftKey, loadDrafts, readOnly]
  );

  const clearDrafts = useCallback(() => {
    if (readOnly || typeof window === "undefined") return;
    localStorage.removeItem(draftKey);
  }, [draftKey, readOnly]);

  const onRowsChange = useCallback(
    (newRows: Row[], { indexes, column }: { indexes: number[]; column: Column<Row> }) => {
      const rowIndex = indexes[0];
      const colKey = column.key as string;
      if (!colKey.startsWith("d")) {
        setRows(newRows);
        return;
      }

      const updatedRows = [...newRows];
      const rawValue = updatedRows[rowIndex][colKey];
      updatedRows[rowIndex] = {
        ...updatedRows[rowIndex],
        [colKey]: sanitizeInput(rawValue)
      };

      setRows(updatedRows);

      const day = Number(colKey.slice(1));
      const date = `${month}-${day.toString().padStart(2, "0")}`;
      const entries: Record<string, number> = {};
      let total = 0;
      updatedRows.forEach((row) => {
        const value = Number(row[colKey] || 0);
        if (value > 0) {
          entries[row.id] = value;
          total += value;
        }
      });
      total = Math.round(total * 10) / 10;
      if (total === 0) {
        updateDraft(date, entries, true);
      } else {
        updateDraft(date, entries, false);
      }
    },
    [month, updateDraft]
  );

  const handleMonthChange = (value: string) => {
    if (!value) return;
    setMonth(value);
  };

  useEffect(() => {
    if (readOnly) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsaved) return;
      event.preventDefault();
      event.returnValue = "保存していない変更があります。";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsaved, readOnly]);

  useEffect(() => {
    if (readOnly) return;
    const handleClick = (event: MouseEvent) => {
      if (!hasUnsaved) return;
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      const shouldLeave = window.confirm("保存していない変更があります。移動しますか？");
      if (!shouldLeave) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [hasUnsaved, readOnly]);

  useEffect(() => {
    if (readOnly) return;
    const allowNavigation = { current: false };
    if (hasUnsaved) {
      window.history.pushState({ wmUnsavedGuard: true }, "", window.location.href);
    }

    const handlePopState = () => {
      if (!hasUnsaved) return;
      if (allowNavigation.current) {
        allowNavigation.current = false;
        return;
      }
      const shouldLeave = window.confirm("保存していない変更があります。移動しますか？");
      if (shouldLeave) {
        allowNavigation.current = true;
        window.history.back();
      } else {
        window.history.pushState({ wmUnsavedGuard: true }, "", window.location.href);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [hasUnsaved, readOnly]);

  const handleSaveAll = useCallback(async () => {
    if (!data) return;
    if (readOnly) return;
    setSaving(true);
    setMessage(null);
    const invalidDays: number[] = [];
    const bulkEntries: Array<{ date: string; projectItemId: string; value: number }> = [];

    for (let day = 1; day <= data.days; day += 1) {
      const key = `d${day}`;
      const date = `${data.month}-${day.toString().padStart(2, "0")}`;
      let total = 0;

      rows.forEach((row) => {
        const value = Number(row[key] || 0);
        if (value > 0) {
          bulkEntries.push({
            date,
            projectItemId: row.id,
            value
          });
          total += value;
        }
      });

      total = Math.round(total * 10) / 10;
      if (total !== 0 && total !== 100) {
        invalidDays.push(day);
      }
    }

    if (invalidDays.length > 0) {
      setMessage(`合計が100になっていない日があります: ${invalidDays.join(", ")}`);
      setInvalidWarning(true);
      setSaving(false);
      return;
    }

    const res = await fetch("/api/month/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month: data.month,
        entries: bulkEntries
      })
    });
    let ok = res.ok;

    const initialPersonal = new Set(data.personalHolidays);
    const toAdd = Array.from(selectedHolidays).filter((date) => !initialPersonal.has(date));
    const toRemove = Array.from(initialPersonal).filter(
      (date) => !selectedHolidays.has(date)
    );

    if (ok && (toAdd.length > 0 || toRemove.length > 0)) {
      const requests = [
        ...toAdd.map((date) =>
          fetch("/api/holidays/personal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date })
          })
        ),
        ...toRemove.map((date) =>
          fetch("/api/holidays/personal", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date })
          })
        )
      ];
      const results = await Promise.all(requests);
      if (!results.every((res) => res.ok)) {
        ok = false;
      }
    }

    if (ok) {
      setMessage("保存しました。");
      setInvalidWarning(false);
      clearDrafts();
    } else {
      setMessage("保存に失敗しました。");
      setInvalidWarning(false);
    }
    setSaving(false);
    fetchMonth(month);
  }, [clearDrafts, data, fetchMonth, month, readOnly, rows, selectedHolidays]);

  const goPrev = () => {
    const [y, m] = month.split("-").map(Number);
    const prevMonth = m === 1 ? 12 : m - 1;
    const prevYear = m === 1 ? y - 1 : y;
    setMonth(`${prevYear}-${prevMonth.toString().padStart(2, "0")}`);
  };

  const goNext = () => {
    const [y, m] = month.split("-").map(Number);
    const nextMonth = m === 12 ? 1 : m + 1;
    const nextYear = m === 12 ? y + 1 : y;
    setMonth(`${nextYear}-${nextMonth.toString().padStart(2, "0")}`);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">月次工数入力</h2>
          <p className="mt-2 text-sm text-slate-500">
            入力後に保存ボタンで保存します。日合計は100にしてください。
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button className="rounded-md border border-slate-200 px-3 py-1" onClick={goPrev}>
            前月
          </button>
          <input
            type="month"
            value={month}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="rounded-md border border-slate-200 px-3 py-1"
          />
          <button className="rounded-md border border-slate-200 px-3 py-1" onClick={goNext}>
            次月
          </button>
          {!readOnly && (
            <button
              className={`rounded-md px-3 py-1 ${
                canSave
                  ? "bg-slate-900 text-white"
                  : "cursor-not-allowed bg-slate-200 text-slate-500"
              }`}
              onClick={handleSaveAll}
              disabled={!canSave}
            >
              保存
            </button>
          )}
        </div>
      </div>

      {message && (
        <div
          className={`rounded-md border px-3 py-2 text-xs ${
            invalidWarning
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-slate-200 bg-white text-slate-600"
          }`}
        >
          {message}
        </div>
      )}

      {readOnly && data && incompleteDays.length > 0 && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          未入力扱いの日: {incompleteDays.join(", ")}
        </div>
      )}

      {!loading && data && !readOnly && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-sm font-semibold text-slate-700">休日設定</div>
          <div className="grid grid-cols-7 gap-2 text-xs text-slate-500">
            {["日", "月", "火", "水", "木", "金", "土"].map((label) => (
              <div key={label} className="text-center font-semibold">
                {label}
              </div>
            ))}
          </div>
          <div className="mt-2 space-y-2">
            {calendar.weeks.map((week, index) => (
              <div key={index} className="grid grid-cols-7 gap-2">
                {week.map((day, dayIndex) => {
                  if (!day) {
                    return <div key={`blank-${index}-${dayIndex}`} className="h-10" />;
                  }
                  const date = `${data.month}-${day.toString().padStart(2, "0")}`;
                  const isSelected = selectedHolidays.has(date);
                  const isHoliday = holidays.has(date);
                  const isFixed = baseHolidays.has(date);
                  return (
                    <button
                      key={date}
                      type="button"
                      onClick={() => toggleHoliday(date)}
                      className={`flex h-10 flex-col items-center justify-center rounded-md border text-xs ${
                        isHoliday || isSelected
                          ? "border-rose-300 bg-rose-50 text-rose-700"
                          : "border-slate-200 text-slate-700"
                      } ${isFixed ? "cursor-not-allowed opacity-70" : ""}`}
                      disabled={isFixed}
                    >
                      <span>{day}</span>
                      <span className={isHoliday ? "text-rose-600" : "text-transparent"}>
                        休
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-slate-500">
            クリックで休日を切り替えます。保存ボタンで確定します。
          </div>
        </div>
      )}

      {loading && <div className="text-sm text-slate-500">読み込み中...</div>}

      {!loading && data && data.items.length === 0 && (
        <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500">
          ユニットが未設定、またはプロジェクトが割り当てられていません。
        </div>
      )}

      {!loading && data && data.items.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {!readOnly && (
            <div className="mb-2 text-xs text-slate-500">
              {saving ? "保存中..." : ""}
            </div>
          )}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
            <div className="flex">
              <div className="flex-none" style={{ width: frozenWidth }}>
                <div className="flex" style={{ height: headerRowHeight }}>
                  {frozenHeaders.map((cell) => (
                    <div
                      key={cell.key}
                      className="flex items-center border-r border-slate-200 px-2 text-xs font-semibold text-slate-700"
                      style={{ width: cell.width }}
                    >
                      <div className="w-full text-left">{cell.content}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative flex-1 overflow-hidden">
                <div
                  className="flex"
                  style={{
                    height: headerRowHeight,
                    width: scrollWidth,
                    transform: `translateX(-${scrollLeft}px)`
                  }}
                >
                  {scrollHeaders.map((cell) => (
                    <div
                      key={cell.key}
                      className="flex items-center justify-center border-r border-slate-200 px-2 text-xs font-semibold text-slate-700"
                      style={{ width: cell.width }}
                    >
                      <div className="w-full text-center">{cell.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-y-visible">
            <DataGrid
              columns={columns}
              rows={rows}
              onRowsChange={readOnly ? undefined : onRowsChange}
              onScroll={handleGridScroll}
              onCellClick={
                readOnly
                  ? undefined
                  : (args) => {
                      if (args.column.key.startsWith("d")) {
                        args.selectCell(true);
                      }
                    }
              }
              className="rdg-light timesheet-grid"
              rowClass={rowClass}
              rowHeight={getRowHeight}
              headerRowHeight={0}
              style={{ height: gridHeight }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
