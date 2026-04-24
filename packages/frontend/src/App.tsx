import { useState } from "react";
import { trpc } from "./trpc";

export function App() {
  const users = trpc.user.list.useQuery();
  const posts = trpc.post.list.useQuery();
  const utils = trpc.useUtils();

  const createPost = trpc.post.create.useMutation({
    onSuccess: () => utils.post.list.invalidate(),
  });

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [authorId, setAuthorId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !authorId) return;
    createPost.mutate(
      { title, content, authorId },
      {
        onSuccess: () => {
          setTitle("");
          setContent("");
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <h1 className="text-3xl font-bold text-gray-900">Project Base</h1>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-800">Users</h2>
          {users.isLoading && <p className="text-gray-500">Loading...</p>}
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
      </div>
    </div>
  );
}
