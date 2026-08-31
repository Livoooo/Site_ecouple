import { NextResponse } from "next/server";
import { deleteConversation, getConversation } from "@/lib/discussions-store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const conversation = await getConversation(id);
  if (!conversation) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(conversation);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await deleteConversation(id);
  return NextResponse.json({ ok: true });
}
