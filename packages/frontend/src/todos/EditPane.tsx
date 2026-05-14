import { useEffect, useMemo, useState } from "react";
import {
  DAY_OF_WEEK_LABELS,
  PRIORITY_DESCRIPTIONS,
  PRIORITY_LABELS,
  type Priority,
  type Schedule,
} from "shared";
import { trpc, type RouterOutput } from "../trpc";

type TodoItem = RouterOutput["todos"]["list"][number];

interface EditPaneProps {
  todo: TodoItem;
  onClose: () => void;
}

type ScheduleKind = "none" | Schedule["type"];

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/**
 * Local state for the schedule editor. We keep one field per schedule type
 * so users can flip between modes without losing what they typed.
 */
interface ScheduleFormState {
  kind: ScheduleKind;
  intervalDays: number;
  dayOfWeek: number;
  dayOfMonth: number;
  yearMonth: number;
  yearDay: number;
}

function fromSchedule(s: Schedule | null): ScheduleFormState {
  const defaults: ScheduleFormState = {
    kind: "none",
    intervalDays: 5,
    dayOfWeek: 4,
    dayOfMonth: 1,
    yearMonth: 1,
    yearDay: 1,
  };
  if (!s) return defaults;
  switch (s.type) {
    case "interval":
      return { ...defaults, kind: "interval", intervalDays: s.intervalDays };
    case "day_of_week":
      return { ...defaults, kind: "day_of_week", dayOfWeek: s.dayOfWeek };
    case "day_of_month":
      return { ...defaults, kind: "day_of_month", dayOfMonth: s.dayOfMonth };
    case "day_of_year":
      return {
        ...defaults,
        kind: "day_of_year",
        yearMonth: s.month,
        yearDay: s.dayOfMonth,
      };
  }
}

function toSchedule(state: ScheduleFormState): Schedule | null {
  switch (state.kind) {
    case "none":
      return null;
    case "interval":
      return { type: "interval", intervalDays: state.intervalDays };
    case "day_of_week":
      return { type: "day_of_week", dayOfWeek: state.dayOfWeek };
    case "day_of_month":
      return { type: "day_of_month", dayOfMonth: state.dayOfMonth };
    case "day_of_year":
      return {
        type: "day_of_year",
        month: state.yearMonth,
        dayOfMonth: state.yearDay,
      };
  }
}

function schedulesEqual(a: Schedule | null, b: Schedule | null): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function EditPane({ todo, onClose }: EditPaneProps) {
  const [title, setTitle] = useState(todo.title);
  const [priority, setPriority] = useState<Priority>(todo.priority as Priority);
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormState>(() =>
    fromSchedule(todo.schedule),
  );
  const [leadTimeDays, setLeadTimeDays] = useState<number | null>(
    todo.leadTimeDays,
  );
  const utils = trpc.useUtils();

  useEffect(() => {
    setTitle(todo.title);
    setPriority(todo.priority as Priority);
    setScheduleForm(fromSchedule(todo.schedule));
    setLeadTimeDays(todo.leadTimeDays);
  }, [todo.id, todo.title, todo.priority, todo.schedule, todo.leadTimeDays]);

  const updateTodo = trpc.todos.update.useMutation({
    onSuccess: () => {
      utils.todos.list.invalidate();
    },
  });
  const deleteSeries = trpc.todos.deleteSeries.useMutation({
    onSuccess: () => {
      utils.todos.list.invalidate();
    },
  });

  const nextSchedule = useMemo(() => toSchedule(scheduleForm), [scheduleForm]);
  const scheduleChanged = !schedulesEqual(nextSchedule, todo.schedule);

  const leadTimeChanged = leadTimeDays !== todo.leadTimeDays;

  const dirty =
    title.trim() !== todo.title ||
    priority !== todo.priority ||
    scheduleChanged ||
    leadTimeChanged;

  const handleSave = () => {
    const trimmed = title.trim();
    if (!trimmed || updateTodo.isPending) return;

    type Changes = Parameters<typeof updateTodo.mutate>[0];
    const changes: Changes = { id: todo.id };
    if (trimmed !== todo.title) changes.title = trimmed;
    if (priority !== todo.priority) changes.priority = priority;
    if (scheduleChanged) changes.schedule = nextSchedule;
    if (leadTimeChanged) changes.leadTimeDays = leadTimeDays;

    if (Object.keys(changes).length > 1) {
      updateTodo.mutate(changes);
    }
  };

  const handleToggleCompleted = () => {
    updateTodo.mutate({ id: todo.id, completed: !todo.completed });
  };

  const handleDeleteSeries = () => {
    if (!todo.configId) return;
    if (
      !window.confirm(
        "Delete the entire recurring series? This removes every past and future instance.",
      )
    ) {
      return;
    }
    deleteSeries.mutate({ configId: todo.configId });
    onClose();
  };

  return (
    <div className="flex h-full flex-col border-l bg-white">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h2 className="text-sm font-semibold text-gray-900">Edit Todo</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close edit pane"
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <div>
          <label htmlFor="edit-title" className="mb-1 block text-xs font-medium text-gray-500">
            Title
          </label>
          <textarea
            id="edit-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-gray-500">
            Priority
          </label>
          <div className="space-y-1.5">
            {([1, 2, 3, 4] as Priority[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  priority === p
                    ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <span
                  className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${
                    p === 1 ? "bg-red-500" : p === 2 ? "bg-orange-400" : p === 3 ? "bg-yellow-400" : "bg-gray-300"
                  }`}
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-800">
                    {PRIORITY_LABELS[p]}
                  </div>
                  <div className="text-xs text-gray-500">
                    {PRIORITY_DESCRIPTIONS[p]}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-gray-500">
            Schedule
          </label>
          <ScheduleEditor state={scheduleForm} onChange={setScheduleForm} />
          {todo.configId && (
            <button
              type="button"
              onClick={handleDeleteSeries}
              disabled={deleteSeries.isPending}
              className="mt-2 text-xs text-red-600 hover:underline disabled:opacity-50"
            >
              Delete entire series
            </button>
          )}
        </div>

        {scheduleForm.kind !== "none" && (
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-500">
              Lead Time
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={leadTimeDays !== null}
                  onChange={(e) =>
                    setLeadTimeDays(e.target.checked ? 7 : null)
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Show in advance of due date
              </label>
              {leadTimeDays !== null && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span>Show</span>
                  <input
                    type="number"
                    min={0}
                    max={365}
                    value={leadTimeDays}
                    onChange={(e) =>
                      setLeadTimeDays(
                        Math.max(0, Math.min(365, Number(e.target.value) || 0)),
                      )
                    }
                    className="w-20 rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span>days before due</span>
                </div>
              )}
            </div>
            <p className="mt-1.5 text-xs text-gray-400">
              {leadTimeDays !== null
                ? `Will appear ${leadTimeDays} day${leadTimeDays !== 1 ? "s" : ""} before the due date when filtered.`
                : "No lead time — always visible when filtered."}
            </p>
          </div>
        )}

        <div>
          <label className="mb-2 block text-xs font-medium text-gray-500">
            Status
          </label>
          <button
            type="button"
            onClick={handleToggleCompleted}
            disabled={updateTodo.isPending}
            className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors disabled:opacity-50 ${
              todo.completed
                ? "border-green-200 bg-green-50"
                : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                todo.completed
                  ? "border-green-500 bg-green-500 text-white"
                  : "border-gray-300"
              }`}
            >
              {todo.completed && (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              )}
            </span>
            <span className="text-sm text-gray-800">
              {todo.completed ? "Completed — click to reopen" : "Mark as completed"}
            </span>
          </button>
        </div>
      </div>

      {dirty && (
        <div className="shrink-0 border-t px-5 py-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setTitle(todo.title);
                setPriority(todo.priority as Priority);
                setScheduleForm(fromSchedule(todo.schedule));
                setLeadTimeDays(todo.leadTimeDays);
              }}
              className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!title.trim() || updateTodo.isPending}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface ScheduleEditorProps {
  state: ScheduleFormState;
  onChange: (next: ScheduleFormState) => void;
}

function ScheduleEditor({ state, onChange }: ScheduleEditorProps) {
  const KINDS: { kind: ScheduleKind; label: string }[] = [
    { kind: "none", label: "One-off (no recurrence)" },
    { kind: "interval", label: "Every N days" },
    { kind: "day_of_week", label: "Day of week" },
    { kind: "day_of_month", label: "Day of month" },
    { kind: "day_of_year", label: "Day of year" },
  ];

  return (
    <div className="space-y-2">
      <select
        value={state.kind}
        onChange={(e) =>
          onChange({ ...state, kind: e.target.value as ScheduleKind })
        }
        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {KINDS.map((k) => (
          <option key={k.kind} value={k.kind}>
            {k.label}
          </option>
        ))}
      </select>

      {state.kind === "interval" && (
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <span>Every</span>
          <input
            type="number"
            min={1}
            max={3650}
            value={state.intervalDays}
            onChange={(e) =>
              onChange({
                ...state,
                intervalDays: Math.max(
                  1,
                  Math.min(3650, Number(e.target.value) || 1),
                ),
              })
            }
            className="w-20 rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span>days after the last completion</span>
        </div>
      )}

      {state.kind === "day_of_week" && (
        <select
          value={state.dayOfWeek}
          onChange={(e) =>
            onChange({ ...state, dayOfWeek: Number(e.target.value) })
          }
          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {DAY_OF_WEEK_LABELS.map((label, idx) => (
            <option key={idx} value={idx}>
              Every {label}
            </option>
          ))}
        </select>
      )}

      {state.kind === "day_of_month" && (
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <span>Day</span>
          <input
            type="number"
            min={1}
            max={31}
            value={state.dayOfMonth}
            onChange={(e) =>
              onChange({
                ...state,
                dayOfMonth: Math.max(
                  1,
                  Math.min(31, Number(e.target.value) || 1),
                ),
              })
            }
            className="w-20 rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span>of every month</span>
        </div>
      )}

      {state.kind === "day_of_year" && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
          <select
            value={state.yearMonth}
            onChange={(e) =>
              onChange({ ...state, yearMonth: Number(e.target.value) })
            }
            className="rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MONTH_LABELS.map((m, idx) => (
              <option key={idx} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            max={31}
            value={state.yearDay}
            onChange={(e) =>
              onChange({
                ...state,
                yearDay: Math.max(
                  1,
                  Math.min(31, Number(e.target.value) || 1),
                ),
              })
            }
            className="w-20 rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span>every year</span>
        </div>
      )}
    </div>
  );
}
