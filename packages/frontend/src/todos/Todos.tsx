import { useState } from "react";
import { trpc } from "../trpc";

export function Todos() {
  const [title, setTitle] = useState("");
  const utils = trpc.useUtils();

  const todosQuery = trpc.todos.list.useQuery();

  const createTodo = trpc.todos.create.useMutation({
    onSuccess: () => {
      utils.todos.list.invalidate();
    },
  });

  const setCompleted = trpc.todos.setCompleted.useMutation({
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
    createTodo.mutate({ title: trimmed });
    setTitle("");
  };

  const todos = todosQuery.data ?? [];

  return (
    <div className="flex h-full flex-col">
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
                <li
                  key={todo.id}
                  className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3 shadow-sm"
                >
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={(e) =>
                      setCompleted.mutate({
                        id: todo.id,
                        completed: e.target.checked,
                      })
                    }
                    className="h-5 w-5 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span
                    className={`flex-1 text-sm ${
                      todo.completed
                        ? "text-gray-400 line-through"
                        : "text-gray-800"
                    }`}
                  >
                    {todo.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteTodo.mutate({ id: todo.id })}
                    aria-label="Delete todo"
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                  >
                    ×
                  </button>
                </li>
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
  );
}
