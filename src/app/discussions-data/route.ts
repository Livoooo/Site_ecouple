import { NextRequest, NextResponse } from "next/server";
import { partyRoomUrl } from "@/lib/party-http";

// Relais côté serveur vers PartyKit : évite tout fetch cross-origin depuis
// le navigateur (qui peut être bloqué selon l'appareil/réseau), puisque le
// navigateur ne parle qu'à ce même domaine.
const MAX_ATTEMPTS = 4;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function proxy(url: string, init?: RequestInit) {
  let lastFailure: NextResponse | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, { ...init, cache: "no-store" });
      const data = await res.text();

      if (!res.ok) {
        // Réponse 5xx renvoyée par Cloudflare/PartyKit : on capture les
        // headers cf-ray/cf-mitigated pour distinguer un vrai souci du
        // Durable Object d'un blocage réseau (WAF/réputation IP) côté
        // Cloudflare, avant de réessayer quelques fois.
        lastFailure = NextResponse.json(
          {
            error: "upstream-error",
            upstreamUrl: url,
            upstreamStatus: res.status,
            upstreamStatusText: res.statusText,
            upstreamBody: data.slice(0, 1000),
            upstreamCfRay: res.headers.get("cf-ray"),
            upstreamCfMitigated: res.headers.get("cf-mitigated"),
            upstreamServer: res.headers.get("server"),
            attempts: attempt,
          },
          { status: 502 }
        );
        if (res.status >= 500 && attempt < MAX_ATTEMPTS) {
          await sleep(attempt * 300);
          continue;
        }
        return lastFailure;
      }

      return new NextResponse(data, {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      lastFailure = NextResponse.json(
        {
          error: "fetch-exception",
          upstreamUrl: url,
          message: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
          attempts: attempt,
        },
        { status: 502 }
      );
      if (attempt < MAX_ATTEMPTS) {
        await sleep(attempt * 300);
        continue;
      }
      return lastFailure;
    }
  }

  return lastFailure!;
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
