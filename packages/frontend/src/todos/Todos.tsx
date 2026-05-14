import { useState } from "react";
import { PRIORITY_LABELS, type Priority } from "shared";
import { trpc, type RouterOutput } from "../trpc";
import { EditPane } from "./EditPane";

type TodoItem = RouterOutput["todos"]["list"][number];

export function Todos() {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>(3);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || createTodo.isPending) return;
    createTodo.mutate({ title: trimmed, priority });
    setTitle("");
  };

  const todos = todosQuery.data ?? [];
  const editingTodo = editingId ? todos.find((t) => t.id === editingId) : null;

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-2xl">
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
          <div className="mx-auto flex max-w-2xl gap-3">
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
            <button
              type="submit"
              disabled={!title.trim() || createTodo.isPending}
              className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Add
            </button>
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
      <span
        className={`flex-1 text-sm ${
          todo.completed ? "text-gray-400 line-through" : "text-gray-800"
        }`}
      >
        {todo.title}
      </span>
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
