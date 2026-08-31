import { NextRequest, NextResponse } from "next/server";
import { createConversation, listConversations } from "@/lib/discussions-store";

export async function GET() {
  const conversations = await listConversations();
  return NextResponse.json(conversations);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (typeof body.title !== "string" || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const conversation = await createConversation(body.title, body.messages);
  return NextResponse.json(conversation);
}
