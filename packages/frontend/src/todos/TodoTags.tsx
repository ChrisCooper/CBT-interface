import { useState } from "react";
import {
  TAG_COLORS,
  TAG_COLOR_CLASSES,
  type TagColor,
} from "shared";
import { trpc, type RouterOutput } from "../trpc";

type TagItem = RouterOutput["todos"]["tags"]["list"][number];

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
  const [newColor, setNewColor] = useState<TagColor>("gray");

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed || createTag.isPending) return;
    createTag.mutate(
      { name: trimmed, color: newColor },
      {
        onSuccess: () => {
          setNewName("");
          setNewColor("gray");
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
            <ColorPicker value={newColor} onChange={setNewColor} />
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

  const cls = TAG_COLOR_CLASSES[tag.color as TagColor];

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
          <ColorPicker value={editColor} onChange={setEditColor} />
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
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${cls.bg} ${cls.text}`}
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

function ColorPicker({
  value,
  onChange,
}: {
  value: TagColor;
  onChange: (color: TagColor) => void;
}) {
  const SWATCH_CLASSES: Record<TagColor, string> = {
    gray: "bg-gray-400",
    red: "bg-red-400",
    orange: "bg-orange-400",
    yellow: "bg-yellow-400",
    green: "bg-green-400",
    blue: "bg-blue-400",
    purple: "bg-purple-400",
    pink: "bg-pink-400",
  };

  return (
    <div className="flex gap-1">
      {TAG_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          title={c}
          className={`h-6 w-6 rounded-full ${SWATCH_CLASSES[c]} transition-all ${
            value === c
              ? "ring-2 ring-offset-1 ring-blue-600 scale-110"
              : "opacity-60 hover:opacity-100"
          }`}
        />
      ))}
    </div>
  );
}
