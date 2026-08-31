"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  deleteConversation,
  getConversationsServerSnapshot,
  getConversationsSnapshot,
  subscribeToConversations,
} from "@/lib/conversations-storage";

export default function DiscussionsPage() {
  const conversations = useSyncExternalStore(
    subscribeToConversations,
    getConversationsSnapshot,
    getConversationsServerSnapshot
  );

  const handleDelete = (id: string) => {
    if (!confirm("Supprimer cette conversation ?")) return;
    deleteConversation(id);
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
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Nos discussions
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {conversations.length === 0 ? (
          <p className="mt-12 text-center text-sm text-zinc-400 dark:text-zinc-500">
            Aucune conversation pour l&apos;instant. Appuie sur + pour en créer
            une.
          </p>
        ) : (
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
                    className="rounded-xl border border-black/10 p-4 text-zinc-400 hover:bg-black/5 hover:text-red-500 dark:border-white/10 dark:hover:bg-white/5"
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
        className="fixed right-6 bottom-6 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-2xl text-white shadow-lg transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        +
      </Link>
    </div>
  );
}
