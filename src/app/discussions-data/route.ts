import { NextRequest, NextResponse } from "next/server";
import { partyRoomUrl } from "@/lib/party-http";

// Relais côté serveur vers PartyKit : évite tout fetch cross-origin depuis
// le navigateur (qui peut être bloqué selon l'appareil/réseau), puisque le
// navigateur ne parle qu'à ce même domaine.
async function proxy(url: string, init?: RequestInit) {
  try {
    const res = await fetch(url, { ...init, cache: "no-store" });
    const data = await res.text();

    if (!res.ok) {
      // On remonte le détail complet (statut + corps exact renvoyé par
      // PartyKit ou par un éventuel proxy/pare-feu intermédiaire) au lieu
      // de juste transmettre le code, pour pouvoir diagnostiquer.
      return NextResponse.json(
        {
          error: "upstream-error",
          upstreamUrl: url,
          upstreamStatus: res.status,
          upstreamStatusText: res.statusText,
          upstreamBody: data.slice(0, 1000),
        },
        { status: 502 }
      );
    }

    return new NextResponse(data, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "fetch-exception",
        upstreamUrl: url,
        message: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      },
      { status: 502 }
    );
  }
}

export async function GET() {
  return proxy(partyRoomUrl("discussions"));
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxy(partyRoomUrl("discussions"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  return proxy(`${partyRoomUrl("discussions")}?id=${id}`, { method: "DELETE" });
}
