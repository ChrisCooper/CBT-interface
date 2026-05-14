import { useEffect, useState } from "react";
import {
  PRIORITY_LABELS,
  PRIORITY_DESCRIPTIONS,
  type Priority,
} from "shared";
import { trpc, type RouterOutput } from "../trpc";

type TodoItem = RouterOutput["todos"]["list"][number];

interface EditPaneProps {
  todo: TodoItem;
  onClose: () => void;
}

export function EditPane({ todo, onClose }: EditPaneProps) {
  const [title, setTitle] = useState(todo.title);
  const [priority, setPriority] = useState<Priority>(todo.priority as Priority);
  const utils = trpc.useUtils();

  useEffect(() => {
    setTitle(todo.title);
    setPriority(todo.priority as Priority);
  }, [todo.id, todo.title, todo.priority]);

  const updateTodo = trpc.todos.update.useMutation({
    onSuccess: () => {
      utils.todos.list.invalidate();
    },
  });

  const handleSave = () => {
    const trimmed = title.trim();
    if (!trimmed || updateTodo.isPending) return;

    const changes: Parameters<typeof updateTodo.mutate>[0] = { id: todo.id };
    if (trimmed !== todo.title) changes.title = trimmed;
    if (priority !== todo.priority) changes.priority = priority;

    if (changes.title !== undefined || changes.priority !== undefined) {
      updateTodo.mutate(changes);
    }
  };

  const handleToggleCompleted = () => {
    updateTodo.mutate({ id: todo.id, completed: !todo.completed });
  };

  const dirty = title.trim() !== todo.title || priority !== todo.priority;

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
