import { useCallback, useRef, useState } from "react";
import { trpc } from "./trpc";
import { QueryErrorDisplay } from "./ErrorBoundary";

export function App() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <h1 className="text-3xl font-bold text-gray-900">Project Base</h1>
        <QuerySection />
      </div>
    </div>
  );
}

function QuerySection() {
  const [prompt, setPrompt] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const query = trpc.ai.query.useMutation();

  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setImageDataUrl(reader.result as string);
      reader.readAsDataURL(file);
    },
    [],
  );

  const clearImage = useCallback(() => {
    setImageDataUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    query.mutate({
      prompt,
      image: imageDataUrl ?? undefined,
    });
  };

  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold text-gray-800">
        AI Query
      </h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          placeholder="Ask anything…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
          maxLength={8192}
        />

        <div className="flex items-center gap-3">
          <label className="cursor-pointer rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-700">
            {imageDataUrl ? "Change image" : "Attach image (optional)"}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </label>
          {imageDataUrl && (
            <button
              type="button"
              onClick={clearImage}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Remove
            </button>
          )}
        </div>

        {imageDataUrl && (
          <img
            src={imageDataUrl}
            alt="Attached"
            className="max-h-48 rounded-lg border object-contain"
          />
        )}

        <button
          type="submit"
          disabled={query.isPending || !prompt.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {query.isPending ? "Querying…" : "Send Query"}
        </button>
      </form>

      {query.isError && <QueryErrorDisplay error={query.error} />}

      {query.data && (
        <div className="mt-4 rounded-lg border bg-white px-4 py-3 shadow-sm">
          <h3 className="text-sm font-semibold uppercase text-gray-500">
            Response
          </h3>
          <p className="mt-1 whitespace-pre-wrap text-gray-800">
            {query.data.response}
          </p>
        </div>
      )}
    </section>
  );
}
