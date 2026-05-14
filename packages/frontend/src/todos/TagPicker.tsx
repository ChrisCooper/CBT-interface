import { useState } from "react";
import {
  TAG_COLOR_CLASSES,
  TAG_COLORS,
  type TagColor,
} from "shared";
import { trpc, type RouterOutput } from "../trpc";

type TagItem = RouterOutput["todos"]["tags"]["list"][number];

export function TagBadge({
  tag,
  onRemove,
}: {
  tag: { name: string; color: TagColor };
  onRemove?: () => void;
}) {
  const cls = TAG_COLOR_CLASSES[tag.color];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cls.bg} ${cls.text}`}
    >
      {tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:opacity-70"
        >
          ×
        </button>
      )}
    </span>
  );
}

export function TagPicker({
  selectedIds,
  onChange,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const tagsQuery = trpc.todos.tags.list.useQuery();
  const createTag = trpc.todos.tags.create.useMutation({
    onSuccess: () => tagsQuery.refetch(),
  });
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<TagColor>("gray");

  const allTags = tagsQuery.data ?? [];
  const selectedSet = new Set(selectedIds);

  const toggle = (tagId: string) => {
    if (selectedSet.has(tagId)) {
      onChange(selectedIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedIds, tagId]);
    }
  };

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed || createTag.isPending) return;
    createTag.mutate(
      { name: trimmed, color: newColor },
      {
        onSuccess: (tag) => {
          onChange([...selectedIds, tag.id]);
          setNewName("");
          setNewColor("gray");
          setShowCreate(false);
        },
      },
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {allTags.map((tag) => {
          const isSelected = selectedSet.has(tag.id);
          const cls = TAG_COLOR_CLASSES[tag.color as TagColor];
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggle(tag.id)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${cls.bg} ${cls.text} ${
                isSelected
                  ? "ring-2 ring-offset-1 ring-current"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              {tag.name}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-xs text-gray-400 hover:border-gray-400 hover:text-gray-600"
        >
          + New
        </button>
      </div>

      {showCreate && (
        <div className="flex items-center gap-2 rounded-lg border bg-white p-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Tag name"
            className="min-w-0 flex-1 rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreate();
              }
            }}
          />
          <select
            value={newColor}
            onChange={(e) => setNewColor(e.target.value as TagColor)}
            className="rounded border px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {TAG_COLORS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!newName.trim() || createTag.isPending}
            className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
