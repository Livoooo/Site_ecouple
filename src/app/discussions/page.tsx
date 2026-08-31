"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { partyRoomUrl, type Conversation } from "@/lib/party-http";

export default function DiscussionsPage() {
  const [conversations, setConversations] = useState<Conversation[] | null>(null);

  const load = () => {
    fetch(partyRoomUrl("discussions"))
      .then((res) => res.json())
      .then((data: Conversation[]) => setConversations(data));
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette conversation ?")) return;
    await fetch(`${partyRoomUrl("discussions")}?id=${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-zinc-50 dark:bg-black">
      <div className="flex items-center gap-3 p-4">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← Accueil
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {conversations && conversations.length > 0 && (
          <ul className="flex flex-col gap-2">
            {conversations
              .slice()
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((c) => (
                <li key={c.id} className="flex items-center gap-2">
                  <Link
                    href={`/discussions/${c.id}`}
                    className="flex-1 rounded-xl border border-black/10 bg-white px-4 py-4 text-base font-medium text-zinc-900 shadow-sm transition-colors hover:bg-black/5 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-white/5"
                  >
                    {c.title}
                  </Link>
                  <button
                    onClick={() => handleDelete(c.id)}
                    aria-label="Supprimer"
                    className="rounded-xl border border-black/10 bg-white p-4 text-zinc-400 hover:bg-black/5 hover:text-red-500 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/5"
                  >
                    🗑
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>

      <Link
        href="/discussions/new"
        aria-label="Nouvelle conversation"
        className="fixed bottom-6 left-6 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-2xl text-white shadow-lg transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        +
      </Link>
    </div>
  );
}
