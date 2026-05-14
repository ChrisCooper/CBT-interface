import { useState } from "react";
import type { TagColor } from "shared";
import { trpc, type RouterOutput } from "../trpc";

type TagItem = RouterOutput["todos"]["tags"]["list"][number];

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function TodoTags() {
  const tagsQuery = trpc.todos.tags.list.useQuery();
  const utils = trpc.useUtils();

  const createTag = trpc.todos.tags.create.useMutation({
    onSuccess: () => utils.todos.tags.list.invalidate(),
  });
  const updateTag = trpc.todos.tags.update.useMutation({
    onSuccess: () => utils.todos.tags.list.invalidate(),
  });
  const deleteTag = trpc.todos.tags.delete.useMutation({
    onSuccess: () => utils.todos.tags.list.invalidate(),
  });

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<TagColor>("#6b7280");

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed || createTag.isPending) return;
    createTag.mutate(
      { name: trimmed, color: newColor },
      {
        onSuccess: () => {
          setNewName("");
          setNewColor("#6b7280");
        },
      },
    );
  };

  const allTags = tagsQuery.data ?? [];

  return (
    <div className="h-full overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {tagsQuery.isLoading ? (
          <p className="py-20 text-center text-gray-400">Loading…</p>
        ) : allTags.length === 0 ? (
          <p className="py-20 text-center text-gray-400">
            No tags yet. Create one below.
          </p>
        ) : (
          <ul className="space-y-2">
            {allTags.map((tag) => (
              <TagRow
                key={tag.id}
                tag={tag}
                onUpdate={(fields) =>
                  updateTag.mutate({ id: tag.id, ...fields })
                }
                onDelete={() => deleteTag.mutate({ id: tag.id })}
                disabled={updateTag.isPending || deleteTag.isPending}
              />
            ))}
          </ul>
        )}

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-medium text-gray-700">
            Create new tag
          </h3>
          <div className="flex items-center gap-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Tag name…"
              className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreate();
                }
              }}
            />
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="h-8 w-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={!newName.trim() || createTag.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TagRow({
  tag,
  onUpdate,
  onDelete,
  disabled,
}: {
  tag: TagItem;
  onUpdate: (fields: { name?: string; color?: TagColor }) => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(tag.name);
  const [editColor, setEditColor] = useState<TagColor>(tag.color as TagColor);

  const startEdit = () => {
    setEditName(tag.name);
    setEditColor(tag.color as TagColor);
    setEditing(true);
  };

  const save = () => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    const changes: { name?: string; color?: TagColor } = {};
    if (trimmed !== tag.name) changes.name = trimmed;
    if (editColor !== tag.color) changes.color = editColor;
    if (Object.keys(changes).length > 0) {
      onUpdate(changes);
    }
    setEditing(false);
  };

  const cancel = () => {
    setEditing(false);
    setEditName(tag.name);
    setEditColor(tag.color as TagColor);
  };

  return (
    <li className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3 shadow-sm">
      {editing ? (
        <>
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="min-w-0 flex-1 rounded border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save();
              }
              if (e.key === "Escape") cancel();
            }}
          />
          <input
            type="color"
            value={editColor}
            onChange={(e) => setEditColor(e.target.value)}
            className="h-8 w-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
          />
          <button
            type="button"
            onClick={save}
            disabled={!editName.trim() || disabled}
            className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={cancel}
            className="rounded px-3 py-1 text-sm text-gray-500 hover:bg-gray-100"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <span
            className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium"
            style={{
              backgroundColor: hexToRgba(tag.color, 0.15),
              color: tag.color,
            }}
          >
            {tag.name}
          </span>
          <span className="flex-1" />
          <button
            type="button"
            onClick={startEdit}
            className="rounded px-3 py-1 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={disabled}
            className="rounded px-3 py-1 text-sm text-gray-400 hover:bg-gray-100 hover:text-red-600 disabled:opacity-50"
          >
            Delete
          </button>
        </>
      )}
    </li>
  );
}
