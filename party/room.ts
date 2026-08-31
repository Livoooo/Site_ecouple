import type * as Party from "partykit/server";

type ConversationMessage = { text: string; from: "moi" | "eux" };
type Conversation = {
  id: string;
  title: string;
  messages: ConversationMessage[];
  createdAt: number;
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  // Sans ça, Cloudflare (ou le navigateur) peut mettre en cache la réponse
  // au niveau du edge le plus proche de chaque appareil, donnant des
  // résultats différents selon le réseau/appareil utilisé.
  "Cache-Control": "no-store",
};

// Room volontairement bête : relaie tout message reçu aux autres clients
// connectés (signaling WebRTC + chat) et diffuse le nombre de personnes
// présentes pour que le client sache quand tenter une connexion. Gère aussi,
// via de simples requêtes HTTP, le stockage des conversations "à revivre"
// (persisté dans le storage de la room, indépendant du code déployé).
export default class Room implements Party.Server {
  constructor(readonly room: Party.Room) {}

  onConnect() {
    this.broadcastPeerCount();
  }

  onClose() {
    this.broadcastPeerCount();
  }

  onMessage(
    message: string | ArrayBuffer | ArrayBufferView,
    sender: Party.Connection
  ) {
    for (const conn of this.room.getConnections()) {
      if (conn.id !== sender.id) {
        conn.send(message as string);
      }
    }
  }

  broadcastPeerCount() {
    const count = [...this.room.getConnections()].length;
    this.room.broadcast(JSON.stringify({ type: "peer-count", count }));
  }

  async onRequest(req: Party.PartyRequest): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const list =
      (await this.room.storage.get<Conversation[]>("conversations")) ?? [];

    if (req.method === "GET") {
      return Response.json(list, { headers: CORS_HEADERS });
    }

    if (req.method === "POST") {
      const body = (await req.json()) as { title?: string; messages?: ConversationMessage[] };
      if (typeof body.title !== "string" || !Array.isArray(body.messages)) {
        return Response.json({ error: "invalid body" }, { status: 400, headers: CORS_HEADERS });
      }
      const conversation: Conversation = {
        id: crypto.randomUUID(),
        title: body.title,
        messages: body.messages,
        createdAt: Date.now(),
      };
      await this.room.storage.put("conversations", [...list, conversation]);
      return Response.json(conversation, { headers: CORS_HEADERS });
    }

    if (req.method === "DELETE") {
      const id = new URL(req.url).searchParams.get("id");
      await this.room.storage.put(
        "conversations",
        list.filter((c) => c.id !== id)
      );
      return Response.json({ ok: true }, { headers: CORS_HEADERS });
    }

    return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
  }
}

Room satisfies Party.Worker;
