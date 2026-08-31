import { NextRequest, NextResponse } from "next/server";
import { partyRoomUrl } from "@/lib/party-http";

// Relais côté serveur vers PartyKit : évite tout fetch cross-origin depuis
// le navigateur (qui peut être bloqué selon l'appareil/réseau), puisque le
// navigateur ne parle qu'à ce même domaine.
async function proxy(url: string, init?: RequestInit) {
  try {
    const res = await fetch(url, { ...init, cache: "no-store" });
    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: `relais PartyKit injoignable : ${String(err)}` },
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
