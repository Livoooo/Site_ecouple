import { NextResponse } from "next/server";
import dns from "node:dns/promises";
import { partyRoomUrl } from "@/lib/party-http";

// Route de diagnostic temporaire (à supprimer une fois le 503 "no available
// server" compris) : exécute, depuis ce serveur précis, la même requête que
// /discussions-data mais renvoie TOUT (résolution DNS, tous les headers,
// et une requête de contrôle vers /cdn-cgi/trace qui prouve si Cloudflare
// est réellement atteint). L'absence du header cf-ray sur la réponse 503
// suggère que quelque chose intercepte la requête avant Cloudflare.
export async function GET() {
  const host = process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "(non défini)";
  const roomUrl = partyRoomUrl("discussions");
  const traceUrl = roomUrl.replace(/\/parties\/.*$/, "/cdn-cgi/trace");
  const controlTraceUrl = "https://1.1.1.1/cdn-cgi/trace";

  const result: Record<string, unknown> = { host, roomUrl, traceUrl };

  try {
    result.dns = await dns.resolve(host.split(":")[0]);
  } catch (err) {
    result.dns = `EXCEPTION: ${err instanceof Error ? err.message : String(err)}`;
  }

  try {
    const res = await fetch(roomUrl, { cache: "no-store" });
    const body = await res.text();
    result.mainRequest = {
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
      bodyPreview: body.slice(0, 300),
    };
  } catch (err) {
    result.mainRequest = `EXCEPTION: ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}`;
  }

  try {
    const res = await fetch(traceUrl, { cache: "no-store" });
    result.cfTrace = {
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      body: (await res.text()).slice(0, 500),
    };
  } catch (err) {
    result.cfTrace = `EXCEPTION: ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}`;
  }

  try {
    const res = await fetch(controlTraceUrl, { cache: "no-store" });
    result.controlTrace = {
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      body: (await res.text()).slice(0, 500),
    };
  } catch (err) {
    result.controlTrace = `EXCEPTION: ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}`;
  }

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
