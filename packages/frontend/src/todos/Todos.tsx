import { useMemo, useState } from "react";
import { computeWeightedPriority, describeSchedule, fromIsoDate, localCalendarDay, PRIORITY_LABELS, toIsoDate, type Priority } from "shared";
import { trpc, type RouterOutput } from "../trpc";
import { EditPane } from "./EditPane";
import {
  ScheduleEditor,
  LeadTimeEditor,
  fromSchedule,
  toSchedule,
  type ScheduleFormState,
} from "./ScheduleEditor";
import { TagBadge, TagPicker } from "./TagPicker";

type TodoItem = RouterOutput["todos"]["list"][number];

type SortOption = "importance" | "priority" | "dueDate";

const SORT_LABELS: Record<SortOption, string> = {
  importance: "Importance",
  priority: "Priority Level",
  dueDate: "Due Date",
};

function todayIso(): string {
  return toIsoDate(localCalendarDay(new Date()));
}

export function Todos() {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>(3);
  const [dueDate, setDueDate] = useState(todayIso);
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormState>(() =>
    fromSchedule(null),
  );
  const [isUpkeep, setIsUpkeep] = useState(false);
  const [leadTimeDays, setLeadTimeDays] = useState(0);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDueSoonOnly, setShowDueSoonOnly] = useState(false);
  const [includeUpkeep, setIncludeUpkeep] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("importance");
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
      ...(isUpkeep ? { isUpkeep } : {}),
      ...(leadTimeDays > 0 ? { leadTimeDays } : {}),
      ...(selectedTagIds.length > 0 ? { tagIds: selectedTagIds } : {}),
    });
    setTitle("");
    setDueDate(todayIso());
    setScheduleForm(fromSchedule(null));
    setIsUpkeep(false);
    setLeadTimeDays(0);
    setSelectedTagIds([]);
  };

  const allTodos = todosQuery.data ?? [];

  const isDueSoon = (todo: TodoItem): boolean => {
    if (todo.completed) return true;
    if (!todo.dueDate) return false;
    if (todo.leadTimeDays == null) return true;
    const due = fromIsoDate(todo.dueDate);
    const todayUtc = localCalendarDay(new Date());
    const daysUntilDue = Math.round(
      (due.getTime() - todayUtc.getTime()) / (24 * 60 * 60 * 1000),
    );
    return daysUntilDue <= todo.leadTimeDays;
  };

  const todos = useMemo(() => {
    let filtered = showDueSoonOnly ? allTodos.filter(isDueSoon) : allTodos;
    if (!includeUpkeep) {
      filtered = filtered.filter((t) => !t.isUpkeep);
    }
    const today = localCalendarDay(new Date());

    return [...filtered].sort((a, b) => {
      // Completed items always sink to the bottom
      if (a.completed !== b.completed) return a.completed ? 1 : -1;

      switch (sortBy) {
        case "importance": {
          const wpA = computeWeightedPriority(a.priority as Priority, a.dueDate, a.leadTimeDays, today);
          const wpB = computeWeightedPriority(b.priority as Priority, b.dueDate, b.leadTimeDays, today);
          return (wpB?.weightedPriority ?? 0) - (wpA?.weightedPriority ?? 0);
        }
        case "priority":
          return a.priority - b.priority;
        case "dueDate": {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
        }
      }
    });
  }, [allTodos, showDueSoonOnly, includeUpkeep, sortBy]);

  const editingTodo = editingId ? allTodos.find((t) => t.id === editingId) : null;

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
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
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={includeUpkeep}
                    onClick={() => setIncludeUpkeep((v) => !v)}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                      includeUpkeep ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                        includeUpkeep ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                  Upkeep
                </label>
              </div>
              <div className="flex items-center gap-3">
                {todos.length !== allTodos.length && (
                  <span className="text-xs text-gray-400">
                    {allTodos.length - todos.length} hidden
                  </span>
                )}
                <label className="flex items-center gap-1.5 text-sm text-gray-600">
                  Sort:
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="rounded border border-gray-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                      <option key={key} value={key}>
                        {SORT_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
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
                    dimmed={!showDueSoonOnly && !isDueSoon(todo)}
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
                type="submit"
                disabled={!title.trim() || createTodo.isPending}
                className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Add
              </button>
            </div>

            <div className="mt-3 space-y-4 rounded-lg border bg-gray-50 p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-medium text-gray-500">
                    Lead Time
                  </label>
                  <LeadTimeEditor leadTimeDays={leadTimeDays} onChange={setLeadTimeDays} />
                </div>
                <label className="flex cursor-pointer items-center gap-2 pt-4 text-sm text-gray-600">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isUpkeep}
                    onClick={() => setIsUpkeep((v) => !v)}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                      isUpkeep ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                        isUpkeep ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                  Upkeep
                </label>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-500">
                  Schedule
                </label>
                <ScheduleEditor state={scheduleForm} onChange={setScheduleForm} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-500">
                  Tags
                </label>
                <TagPicker selectedIds={selectedTagIds} onChange={setSelectedTagIds} />
              </div>
            </div>
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
  const due = fromIsoDate(dueDate);
  const todayUtc = localCalendarDay(new Date());
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
  dimmed,
  onToggle,
  onClick,
  onDelete,
}: {
  todo: TodoItem;
  selected: boolean;
  dimmed?: boolean;
  onToggle: (completed: boolean) => void;
  onClick: () => void;
  onDelete: () => void;
}) {
  const overdue = (() => {
    if (todo.completed || !todo.dueDate) return false;
    return fromIsoDate(todo.dueDate) < localCalendarDay(new Date());
  })();

  const wp = todo.completed
    ? null
    : computeWeightedPriority(todo.priority as Priority, todo.dueDate, todo.leadTimeDays, localCalendarDay(new Date()));

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
      } ${dimmed ? "opacity-50" : ""}`}
    >
      <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
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
        {todo.isUpkeep && !todo.completed && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] text-gray-300">
            ⚙
          </span>
        )}
      </span>
      <span
        className={`-mx-1 shrink-0 text-xl leading-none ${
          todo.priority === 1
            ? "text-red-500"
            : todo.priority === 2
              ? "text-yellow-500"
              : todo.priority === 3
                ? "text-green-500"
                : "text-blue-400"
        }`}
        title={PRIORITY_LABELS[todo.priority as Priority]}
      >
        &#9873;
      </span>
      <div className="min-w-0 flex-1">
        <div
          className={`flex items-baseline gap-2 text-sm ${
            todo.completed ? "text-gray-400 line-through" : "text-gray-800"
          }`}
        >
          <span className="truncate">{todo.title}</span>
          {todo.dueDate && !todo.completed && (
            <span
              className={`shrink-0 text-xs ${
                overdue ? "font-medium text-red-600" : "text-gray-400"
              }`}
            >
              ({formatDueDate(todo.dueDate)})
            </span>
          )}
        </div>
        {todo.tags.length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-1">
            {todo.tags.map((tag) => (
              <TagBadge key={tag.id} tag={tag} />
            ))}
          </div>
        )}
        {todo.schedule && (
          <div className="mt-0.5 text-xs text-gray-400">
            ↻ {describeSchedule(todo.schedule)}
          </div>
        )}
        {wp && (
          <div className="mt-0.5 text-xs text-gray-300">
            {wp.priority.toFixed(2)} × {wp.urgency.toFixed(2)} = {wp.weightedPriority.toFixed(2)}
          </div>
        )}
      </div>
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
