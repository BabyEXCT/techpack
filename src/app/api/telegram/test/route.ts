import { NextResponse } from "next/server";
import { sendMessage, adminChatId } from "@/lib/telegram/send";

export const dynamic = "force-dynamic";

export async function GET() {
  const chatId = adminChatId();
  if (!chatId) {
    return NextResponse.json({ error: "TELEGRAM_ADMIN_CHAT_ID not set" }, { status: 400 });
  }
  try {
    await sendMessage(chatId, "✅ Telegram connected.");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
