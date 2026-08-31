// Conversations "à revivre" : stockées uniquement en local (localStorage),
// jamais envoyées au serveur.
export type ConversationMessage = { text: string; from: "moi" | "eux" };
export type Conversation = {
  id: string;
  title: string;
  messages: ConversationMessage[];
  createdAt: number;
};

const STORAGE_KEY = "watch-party-conversations";

function readConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeConversations(list: Conversation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // quota dépassée ou stockage désactivé : on ignore
  }
}

export function createConversation(
  title: string,
  messages: ConversationMessage[]
): Conversation {
  const conversation: Conversation = {
    id: crypto.randomUUID(),
    title,
    messages,
    createdAt: Date.now(),
  };
  writeConversations([...readConversations(), conversation]);
  return conversation;
}

export function deleteConversation(id: string) {
  writeConversations(readConversations().filter((c) => c.id !== id));
  // Un seul onglet à la fois modifie son propre localStorage sans jamais
  // recevoir l'event "storage" (réservé aux AUTRES onglets) : on le simule
  // ici pour que useSyncExternalStore relise l'état à jour dans ce même tab.
  window.dispatchEvent(new Event("storage"));
}

// --- Lecture mise en cache, compatible useSyncExternalStore ---
// getSnapshot doit renvoyer une référence STABLE tant que le contenu réel
// n'a pas changé, sinon React re-render en boucle. On ne re-parse donc le
// JSON que si la chaîne brute a effectivement changé depuis le dernier appel.
let cachedRaw: string | null = null;
let cachedList: Conversation[] = [];

export function subscribeToConversations(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function getConversationsSnapshot(): Conversation[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedList = readConversations();
  }
  return cachedList;
}

export function getConversationsServerSnapshot(): Conversation[] {
  return [];
}

let cachedConversationId: string | null = null;
let cachedConversationSourceList: Conversation[] | null = null;
let cachedConversation: Conversation | null = null;

export function getConversationSnapshot(id: string): Conversation | null {
  const list = getConversationsSnapshot();
  if (list !== cachedConversationSourceList || id !== cachedConversationId) {
    cachedConversationSourceList = list;
    cachedConversationId = id;
    cachedConversation = list.find((c) => c.id === id) ?? null;
  }
  return cachedConversation;
}

export function getConversationServerSnapshot(): null {
  return null;
}
