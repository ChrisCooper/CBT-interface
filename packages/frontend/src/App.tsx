import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Markdown from "react-markdown";

export function App() {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "http://localhost:3000/chat",
    }),
  });

  const isLoading = status !== "ready";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <header className="shrink-0 border-b bg-white px-6 py-4 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">Chat</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.length === 0 && (
            <p className="py-20 text-center text-gray-400">
              Send a message to start chatting.
            </p>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  m.role === "user"
                    ? "bg-blue-600 text-white"
                    : "border bg-white text-gray-800 shadow-sm"
                }`}
              >
                {m.parts.map((part, i) => {
                  if (part.type !== "text") return null;
                  if (m.role === "user") {
                    return <p key={i}>{part.text}</p>;
                  }
                  return (
                    <div key={i} className="prose prose-sm max-w-none">
                      <Markdown>{part.text}</Markdown>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t bg-white px-4 py-4"
      >
        <div className="mx-auto flex max-w-2xl gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message…"
            disabled={isLoading}
            className="flex-1 rounded-full border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
