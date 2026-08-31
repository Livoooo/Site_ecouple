"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  type ConversationMessage,
  createConversation,
} from "@/lib/conversations-storage";

export default function NewDiscussionPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [from, setFrom] = useState<"moi" | "eux">("moi");

  const addMessage = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { text, from }]);
    setDraft("");
    setFrom(from === "moi" ? "eux" : "moi");
  };

  const removeMessage = (index: number) => {
    setMessages((prev) => prev.filter((_, i) => i !== index));
  };

  const save = () => {
    if (!title.trim() || messages.length === 0) return;
    const conversation = createConversation(title.trim(), messages);
    router.push(`/discussions/${conversation.id}`);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-50 dark:bg-black">
      <div className="flex items-center gap-3 p-4">
        <Link
          href="/discussions"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← Retour
        </Link>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Nouvelle conversation
        </h1>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4 pb-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre de la conversation"
          className="rounded-xl border border-black/10 bg-white px-4 py-3 text-base text-zinc-900 outline-none focus:border-zinc-400 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50"
        />

        <div className="flex flex-col gap-2">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 ${m.from === "moi" ? "flex-row-reverse" : ""}`}
            >
              <span
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                  m.from === "moi"
                    ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                    : "bg-black/5 text-zinc-900 dark:bg-white/10 dark:text-zinc-50"
                }`}
              >
                {m.text}
              </span>
              <button
                onClick={() => removeMessage(i)}
                aria-label="Supprimer ce message"
                className="text-xs text-zinc-400 hover:text-red-500"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-black/10 p-4 dark:border-white/10">
        <div className="flex gap-2">
          <button
            onClick={() => setFrom("moi")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${
              from === "moi"
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "border border-black/10 text-zinc-500 dark:border-white/10 dark:text-zinc-400"
            }`}
          >
            Moi
          </button>
          <button
            onClick={() => setFrom("eux")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${
              from === "eux"
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "border border-black/10 text-zinc-500 dark:border-white/10 dark:text-zinc-400"
            }`}
          >
            Toi
          </button>
        </div>
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addMessage();
              }
            }}
            placeholder="Message..."
            className="flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50"
          />
          <button
            onClick={addMessage}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
          >
            Ajouter
          </button>
        </div>
        <button
          onClick={save}
          disabled={!title.trim() || messages.length === 0}
          className="mt-1 rounded-lg bg-zinc-900 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900"
        >
          Enregistrer
        </button>
      </div>
    </div>
  );
}
