"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { partyRoomUrl, type Conversation } from "@/lib/party-http";

export default function DiscussionPage() {
  const params = useParams<{ id: string }>();
  const [conversation, setConversation] = useState<Conversation | null | undefined>(
    undefined
  );
  const [revealedCount, setRevealedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch(partyRoomUrl("discussions"), { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Conversation[]) => {
        setConversation(data.find((c) => c.id === params.id) ?? null);
      })
      .catch((err) => setError(String(err)));
  }, [params.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [revealedCount]);

  const reveal = () => {
    if (!conversation) return;
    setRevealedCount((n) => Math.min(n + 1, conversation.messages.length));
  };

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-zinc-50 p-6 text-center dark:bg-black">
        <p className="text-sm break-all text-red-500">Erreur : {error}</p>
        <Link href="/discussions" className="text-sm text-zinc-500 underline">
          ← Retour à la liste
        </Link>
      </div>
    );
  }

  if (conversation === undefined) return null;

  if (conversation === null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-zinc-50 p-6 text-center dark:bg-black">
        <p className="text-sm text-zinc-400">Conversation introuvable.</p>
        <Link href="/discussions" className="text-sm text-zinc-500 underline">
          ← Retour à la liste
        </Link>
      </div>
    );
  }

  const done = revealedCount >= conversation.messages.length;

  return (
    <div
      onClick={reveal}
      className="flex min-h-0 flex-1 cursor-pointer touch-manipulation flex-col select-none bg-zinc-50 dark:bg-black"
    >
      <div
        className="flex items-center gap-3 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <Link
          href="/discussions"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← Retour
        </Link>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 pb-4">
        {conversation.messages.slice(0, revealedCount).map((m, i) => (
          <div
            key={i}
            className={`flex ${m.from === "moi" ? "justify-end" : "justify-start"}`}
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
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
        {done ? "— fin —" : "touche l'écran pour continuer"}
      </div>
    </div>
  );
}
