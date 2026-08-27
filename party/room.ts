import type * as Party from "partykit/server";

// Room volontairement bête : relaie tout message reçu aux autres clients
// connectés (signaling WebRTC + chat) et diffuse le nombre de personnes
// présentes pour que le client sache quand tenter une connexion.
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
}

Room satisfies Party.Worker;
