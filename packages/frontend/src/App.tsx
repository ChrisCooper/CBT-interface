import { useEffect, useState } from "react";
import { trpc } from "./trpc";
import { QueryErrorDisplay } from "./ErrorBoundary";
import { useUptimeStore } from "./stores/uptime";
import { usePostFormStore } from "./stores/postForm";

const SENTIMENT_STYLES = {
  positive: "bg-green-100 text-green-800",
  negative: "bg-red-100 text-red-800",
  neutral: "bg-gray-100 text-gray-700",
} as const;

function formatUptime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [
    hours > 0 ? `${hours}h` : null,
    minutes > 0 ? `${minutes}m` : null,
    `${seconds}s`,
  ]
    .filter(Boolean)
    .join(" ");
}

export function App() {
  const { uptime, connected, connect } = useUptimeStore();
  const { title, content, authorId, setTitle, setContent, setAuthorId, reset } =
    usePostFormStore();

  useEffect(connect, [connect]);

  const users = trpc.user.list.useQuery();
  const posts = trpc.post.list.useQuery();
  const utils = trpc.useUtils();

  const createPost = trpc.post.create.useMutation({
    onSuccess: () => utils.post.list.invalidate(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !authorId) return;
    createPost.mutate(
      { title, content, authorId },
      { onSuccess: reset },
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <h1 className="text-3xl font-bold text-gray-900">Project Base</h1>

        <section className="rounded-lg border bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
            />
            <h2 className="text-lg font-semibold text-gray-800">
              Server Uptime
            </h2>
          </div>
          {uptime ? (
            <div className="mt-2 space-y-1 text-sm text-gray-600">
              <p>
                Started:{" "}
                <span className="font-mono">
                  {new Date(uptime.serverStartTime).toLocaleString()}
                </span>
              </p>
              <p>
                Uptime:{" "}
                <span className="font-mono">
                  {formatUptime(uptime.uptimeMs)}
                </span>
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-500">Connecting...</p>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-800">Users</h2>
          {users.isLoading && <p className="text-gray-500">Loading...</p>}
          {users.isError && <QueryErrorDisplay error={users.error} />}
          <ul className="space-y-2">
            {users.data?.map((user) => (
              <li
                key={user.id}
                className="rounded-lg border bg-white px-4 py-3 shadow-sm"
              >
                <span className="font-medium">{user.name}</span>{" "}
                <span className="text-gray-500">{user.email}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-800">Posts</h2>
          {posts.isLoading && <p className="text-gray-500">Loading...</p>}
          {posts.isError && <QueryErrorDisplay error={posts.error} />}
          <ul className="space-y-2">
            {posts.data?.map((post) => (
              <li
                key={post.id}
                className="rounded-lg border bg-white px-4 py-3 shadow-sm"
              >
                <h3 className="font-medium">{post.title}</h3>
                <p className="text-gray-600">{post.content}</p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-800">
            New Post
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <select
              value={authorId}
              onChange={(e) => setAuthorId(e.target.value)}
              className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select author…</option>
              {users.data?.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              placeholder="Content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
            <button
              type="submit"
              disabled={createPost.isPending || !authorId}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {createPost.isPending ? "Creating..." : "Create Post"}
            </button>
          </form>
        </section>

        <SummarizeSection />
      </div>
    </div>
  );
}

function SummarizeSection() {
  const [text, setText] = useState("");
  const summarize = trpc.ai.summarize.useMutation();

  const handleSummarize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    summarize.mutate({ text });
  };

  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold text-gray-800">
        AI Text Summarizer
      </h2>
      <form onSubmit={handleSummarize} className="space-y-3">
        <textarea
          placeholder="Paste text to summarize…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
          maxLength={4096}
        />
        <button
          type="submit"
          disabled={summarize.isPending || !text.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {summarize.isPending ? "Summarizing..." : "Summarize"}
        </button>
      </form>

      {summarize.isError && <QueryErrorDisplay error={summarize.error} />}

      {summarize.data && (
        <div className="mt-4 space-y-3 rounded-lg border bg-white px-4 py-3 shadow-sm">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase">Summary</h3>
            <p className="mt-1 text-gray-800">{summarize.data.summary}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase">Sentiment</h3>
            <span className={`mt-1 inline-block rounded-full px-3 py-0.5 text-sm font-medium ${SENTIMENT_STYLES[summarize.data.sentiment]}`}>
              {summarize.data.sentiment}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase">Keywords</h3>
            <div className="mt-1 flex flex-wrap gap-2">
              {summarize.data.keywords.map((kw) => (
                <span key={kw} className="rounded-full bg-blue-50 px-3 py-0.5 text-sm text-blue-700">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
