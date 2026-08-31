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

// Construit un message d'erreur détaillé à partir d'une réponse non-ok du
// relais /discussions-data, pour pouvoir diagnostiquer (au lieu de juste
// afficher un code HTTP sans contexte).
export async function describeProxyError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body?.error === "upstream-error") {
      const debug = `[cf-ray=${body.upstreamCfRay ?? "?"} mitigated=${body.upstreamCfMitigated ?? "?"} server=${body.upstreamServer ?? "?"} attempts=${body.attempts ?? "?"}]`;
      return `PartyKit a répondu ${body.upstreamStatus} ${body.upstreamStatusText} : ${body.upstreamBody} ${debug}`;
    }
    if (body?.error === "fetch-exception") {
      return `Le serveur n'a pas pu joindre PartyKit : ${body.message}`;
    }
    return `HTTP ${res.status} : ${JSON.stringify(body)}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}
