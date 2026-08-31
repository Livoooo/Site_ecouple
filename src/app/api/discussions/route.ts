import { NextRequest, NextResponse } from "next/server";
import { partyRoomUrl } from "@/lib/party-http";

// Relais côté serveur vers PartyKit : évite tout fetch cross-origin depuis
// le navigateur (qui peut être bloqué selon l'appareil/réseau), puisque le
// navigateur ne parle qu'à ce même domaine.
export async function GET() {
  const res = await fetch(partyRoomUrl("discussions"), { cache: "no-store" });
  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const res = await fetch(partyRoomUrl("discussions"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    cache: "no-store",
  });
  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const res = await fetch(`${partyRoomUrl("discussions")}?id=${id}`, {
    method: "DELETE",
    cache: "no-store",
  });
  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
