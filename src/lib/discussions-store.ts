// Stockage serveur des conversations, dans un simple fichier JSON (pas
// besoin d'une vraie base de données pour 2 utilisateurs). Ce module utilise
// `fs`, donc il ne doit être importé QUE depuis des Route Handlers /
// composants serveur, jamais depuis un composant client.
import { promises as fs } from "fs";
import path from "path";

export type ConversationMessage = { text: string; from: "moi" | "eux" };
export type Conversation = {
  id: string;
  title: string;
  messages: ConversationMessage[];
  createdAt: number;
};

const DATA_DIR = path.join(process.cwd(), "data", "dont-open", "private");
const DATA_FILE = path.join(DATA_DIR, "discussions.json");

async function readAll(): Promise<Conversation[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(list: Conversation[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(list, null, 2), "utf-8");
}

export async function listConversations(): Promise<Conversation[]> {
  return readAll();
}

export async function getConversation(id: string): Promise<Conversation | undefined> {
  return (await readAll()).find((c) => c.id === id);
}

export async function createConversation(
  title: string,
  messages: ConversationMessage[]
): Promise<Conversation> {
  const list = await readAll();
  const conversation: Conversation = {
    id: crypto.randomUUID(),
    title,
    messages,
    createdAt: Date.now(),
  };
  list.push(conversation);
  await writeAll(list);
  return conversation;
}

export async function deleteConversation(id: string): Promise<void> {
  const list = await readAll();
  await writeAll(list.filter((c) => c.id !== id));
}
