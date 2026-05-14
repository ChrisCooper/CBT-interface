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

export function TagBadge({
  tag,
  onRemove,
}: {
  tag: { name: string; color: TagColor };
  onRemove?: () => void;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: hexToRgba(tag.color, 0.15), color: tag.color }}
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
  const [newColor, setNewColor] = useState<TagColor>("#6b7280");

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
          setNewColor("#6b7280");
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
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggle(tag.id)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                isSelected
                  ? "ring-2 ring-offset-1"
                  : "opacity-60 hover:opacity-100"
              }`}
              style={{
                backgroundColor: hexToRgba(tag.color, 0.15),
                color: tag.color,
                ...(isSelected ? { ringColor: tag.color } : {}),
              }}
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
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="h-7 w-7 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
          />
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
