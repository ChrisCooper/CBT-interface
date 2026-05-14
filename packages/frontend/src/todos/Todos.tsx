import { useMemo, useState } from "react";
import { describeSchedule, PRIORITY_LABELS, type Priority } from "shared";
import { trpc, type RouterOutput } from "../trpc";
import { EditPane } from "./EditPane";
import {
  ScheduleEditor,
  LeadTimeEditor,
  fromSchedule,
  toSchedule,
  type ScheduleFormState,
} from "./ScheduleEditor";

type TodoItem = RouterOutput["todos"]["list"][number];

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function Todos() {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>(3);
  const [dueDate, setDueDate] = useState(todayIso);
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormState>(() =>
    fromSchedule(null),
  );
  const [leadTimeDays, setLeadTimeDays] = useState(0);
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDueSoonOnly, setShowDueSoonOnly] = useState(false);
  const utils = trpc.useUtils();

  const todosQuery = trpc.todos.list.useQuery();

  const createTodo = trpc.todos.create.useMutation({
    onSuccess: () => {
      utils.todos.list.invalidate();
    },
  });

  const updateTodo = trpc.todos.update.useMutation({
    onSuccess: () => {
      utils.todos.list.invalidate();
    },
  });

  const deleteTodo = trpc.todos.delete.useMutation({
    onSuccess: () => {
      utils.todos.list.invalidate();
    },
  });

  const schedule = useMemo(() => toSchedule(scheduleForm), [scheduleForm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || createTodo.isPending) return;
    createTodo.mutate({
      title: trimmed,
      priority,
      ...(dueDate ? { dueDate } : {}),
      ...(schedule ? { schedule } : {}),
      ...(schedule && leadTimeDays > 0 ? { leadTimeDays } : {}),
    });
    setTitle("");
    setDueDate(todayIso());
    setScheduleForm(fromSchedule(null));
    setLeadTimeDays(0);
    setShowCreateOptions(false);
  };

  const allTodos = todosQuery.data ?? [];

  const todos = useMemo(() => {
    if (!showDueSoonOnly) return allTodos;
    const today = new Date();
    const todayUtc = new Date(
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
    );
    return allTodos.filter((todo) => {
      if (todo.completed) return true;
      if (!todo.dueDate || todo.leadTimeDays == null) return true;
      const [y, m, d] = todo.dueDate.split("-").map(Number) as [number, number, number];
      const due = new Date(Date.UTC(y, m - 1, d));
      const daysUntilDue = Math.round(
        (due.getTime() - todayUtc.getTime()) / (24 * 60 * 60 * 1000),
      );
      return daysUntilDue <= todo.leadTimeDays;
    });
  }, [allTodos, showDueSoonOnly]);

  const editingTodo = editingId ? allTodos.find((t) => t.id === editingId) : null;

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-2xl">
            <div className="mb-4 flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                <button
                  type="button"
                  role="switch"
                  aria-checked={showDueSoonOnly}
                  onClick={() => setShowDueSoonOnly((v) => !v)}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                    showDueSoonOnly ? "bg-blue-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                      showDueSoonOnly ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
                Due soon only
              </label>
              {showDueSoonOnly && todos.length !== allTodos.length && (
                <span className="text-xs text-gray-400">
                  {allTodos.length - todos.length} hidden
                </span>
              )}
            </div>
            {todosQuery.isLoading ? (
              <p className="py-20 text-center text-gray-400">Loading…</p>
            ) : todos.length === 0 ? (
              <p className="py-20 text-center text-gray-400">
                No todos yet. Add one below.
              </p>
            ) : (
              <ul className="space-y-2">
                {todos.map((todo) => (
                  <TodoRow
                    key={todo.id}
                    todo={todo}
                    selected={todo.id === editingId}
                    onToggle={(completed) =>
                      updateTodo.mutate({ id: todo.id, completed })
                    }
                    onClick={() =>
                      setEditingId(todo.id === editingId ? null : todo.id)
                    }
                    onDelete={() => {
                      if (editingId === todo.id) setEditingId(null);
                      deleteTodo.mutate({ id: todo.id });
                    }}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="shrink-0 border-t bg-white px-4 py-4"
        >
          <div className="mx-auto max-w-2xl">
            <div className="flex gap-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Add a new todo…"
                disabled={createTodo.isPending}
                className="flex-1 rounded-full border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value) as Priority)}
                disabled={createTodo.isPending}
                className="rounded-full border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {([1, 2, 3, 4] as Priority[]).map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={createTodo.isPending}
                className="rounded-full border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowCreateOptions((v) => !v)}
                className={`rounded-full border px-3 py-2.5 text-sm transition-colors ${
                  showCreateOptions
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
                title={showCreateOptions ? "Hide options" : "More options (schedule, lead time)"}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                </svg>
              </button>
              <button
                type="submit"
                disabled={!title.trim() || createTodo.isPending}
                className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Add
              </button>
            </div>

            {showCreateOptions && (
              <div className="mt-3 space-y-4 rounded-lg border bg-gray-50 p-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-500">
                    Schedule
                  </label>
                  <ScheduleEditor state={scheduleForm} onChange={setScheduleForm} />
                </div>
                {scheduleForm.kind !== "none" && (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-500">
                      Lead Time
                    </label>
                    <LeadTimeEditor leadTimeDays={leadTimeDays} onChange={setLeadTimeDays} />
                  </div>
                )}
              </div>
            )}

            {!showCreateOptions && (
              <p className="mt-2 text-xs text-gray-400">
                Click the options button to configure a recurring schedule.
              </p>
            )}
          </div>
        </form>
      </div>

      {editingTodo && (
        <div className="w-80 shrink-0">
          <EditPane
            key={editingTodo.id}
            todo={editingTodo}
            onClose={() => setEditingId(null)}
          />
        </div>
      )}
    </div>
  );
}

function formatDueDate(dueDate: string): string {
  const [y, m, d] = dueDate.split("-").map(Number) as [number, number, number];
  const due = new Date(Date.UTC(y, m - 1, d));
  const today = new Date();
  const todayUtc = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
  );
  const diffDays = Math.round(
    (due.getTime() - todayUtc.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1 && diffDays <= 6) return `In ${diffDays} days`;
  if (diffDays < -1 && diffDays >= -6) return `${-diffDays} days ago`;
  return due.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function TodoRow({
  todo,
  selected,
  onToggle,
  onClick,
  onDelete,
}: {
  todo: TodoItem;
  selected: boolean;
  onToggle: (completed: boolean) => void;
  onClick: () => void;
  onDelete: () => void;
}) {
  const overdue = (() => {
    if (todo.completed || !todo.dueDate) return false;
    const [y, m, d] = todo.dueDate.split("-").map(Number) as [
      number,
      number,
      number,
    ];
    const due = new Date(Date.UTC(y, m - 1, d));
    const today = new Date();
    const todayUtc = new Date(
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
    );
    return due < todayUtc;
  })();

  return (
    <li
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 shadow-sm transition-colors ${
        selected
          ? "border-blue-300 bg-blue-50 ring-1 ring-blue-300"
          : "bg-white hover:bg-gray-50"
      }`}
    >
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={(e) => {
          e.stopPropagation();
          onToggle(e.target.checked);
        }}
        onClick={(e) => e.stopPropagation()}
        className="h-5 w-5 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <div className="min-w-0 flex-1">
        <div
          className={`truncate text-sm ${
            todo.completed ? "text-gray-400 line-through" : "text-gray-800"
          }`}
        >
          {todo.title}
        </div>
        {(todo.dueDate || todo.schedule) && (
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
            {todo.dueDate && !todo.completed && (
              <span
                className={
                  overdue ? "font-medium text-red-600" : "text-gray-500"
                }
              >
                {formatDueDate(todo.dueDate)}
              </span>
            )}
            {todo.schedule && (
              <span className="rounded bg-purple-50 px-1.5 py-0.5 text-purple-700">
                ↻ {describeSchedule(todo.schedule)}
              </span>
            )}
          </div>
        )}
      </div>
      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
        {PRIORITY_LABELS[todo.priority as Priority]}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label="Delete todo"
        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"
      >
        ×
      </button>
    </li>
  );
}
