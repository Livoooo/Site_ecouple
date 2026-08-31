export type ConversationMessage = { text: string; from: "moi" | "eux" };
export type Conversation = {
  id: string;
  title: string;
  messages: ConversationMessage[];
  createdAt: number;
};

// Construit une URL HTTP vers une room PartyKit (utilisé pour les requêtes
// GET/POST/DELETE "conversations", en plus du websocket utilisé par la
// watch party). Même détection local/distant que PartySocket : http en
// local, https vers le vrai cloud PartyKit.
function isLocalHost(host: string) {
  return (
    host.startsWith("localhost:") ||
    host.startsWith("127.0.0.1:") ||
    host.startsWith("192.168.") ||
    host.startsWith("10.")
  );
}

export function partyRoomUrl(room: string) {
  const host = process.env.NEXT_PUBLIC_PARTYKIT_HOST!;
  const protocol = isLocalHost(host) ? "http" : "https";
  return `${protocol}://${host}/parties/main/${room}`;
}
