import { useState } from "react";
import { Chat } from "./Chat";
import { Todos } from "./todos/Todos";

type Tab = "todos" | "chat";

export function App() {
  const [tab, setTab] = useState<Tab>("todos");

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <header className="shrink-0 border-b bg-white px-6 pt-4 shadow-sm">
        <div className="mx-auto flex max-w-2xl items-end justify-between">
          <h1 className="pb-3 text-xl font-semibold text-gray-900">
            {tab === "todos" ? "Todos" : "Chat"}
          </h1>
          <nav className="flex gap-1" role="tablist">
            <TabButton
              active={tab === "todos"}
              onClick={() => setTab("todos")}
            >
              Todos
            </TabButton>
            <TabButton active={tab === "chat"} onClick={() => setTab("chat")}>
              Chat
            </TabButton>
          </nav>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {tab === "todos" ? <Todos /> : <Chat />}
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-gray-500 hover:text-gray-800"
      }`}
    >
      {children}
    </button>
  );
}
