// src/lib/telegram/send.ts
const BASE = "https://api.telegram.org/bot";
const FILE_BASE = "https://api.telegram.org/file/bot";

function token(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  return t;
}

type KeyboardOpts = {
  /** One row per array, one button per string */
  buttons: string[][];
  /** true = user can still type, false = keyboard forced. Default true */
  resize?: boolean;
};

export async function sendMessage(
  chatId: string,
  text: string,
  keyboard?: KeyboardOpts
): Promise<void> {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text
  };

  if (keyboard) {
    body.reply_markup = {
      keyboard: keyboard.buttons.map((row) =>
        row.map((label) => ({ text: label }))
      ),
      resize_keyboard: keyboard.resize ?? true,
      one_time_keyboard: false,
      input_field_placeholder: "Tap a command…"
    };
  }

  const url = `${BASE}${token()}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Telegram send failed ${res.status}: ${detail}`);
  }
}

export async function sendDocument(
  chatId: string,
  buffer: Buffer,
  filename: string
): Promise<void> {
  const url = `${BASE}${token()}/sendDocument`;
  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("document", new Blob([buffer as BlobPart]), filename);
  const res = await fetch(url, { method: "POST", body: form });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Telegram sendDocument failed ${res.status}: ${detail}`);
  }
}

/** Returns the full download URL for a Telegram file_id */
export async function getFileUrl(fileId: string): Promise<string> {
  const resp = await fetch(`${BASE}${token()}/getFile?file_id=${fileId}`);
  if (!resp.ok) throw new Error(`getFile failed ${resp.status}`);
  const data = await resp.json();
  const filePath: string = data?.result?.file_path;
  if (!filePath) throw new Error("getFile returned no file_path");
  return `${FILE_BASE}${token()}/${filePath}`;
}

export async function setWebhook(url: string): Promise<void> {
  const api = `${BASE}${token()}/setWebhook?url=${encodeURIComponent(url)}`;
  const res = await fetch(api);
  if (!res.ok) throw new Error(`setWebhook failed ${res.status}`);
}

export function adminChatId(): string | undefined {
  return process.env.TELEGRAM_ADMIN_CHAT_ID;
}

export const MENU_KEYBOARD: KeyboardOpts = {
  buttons: [
    ["📊 Summary", "⚡ Urgent"],
    ["📅 Today", "➕ New Order"],
    ["❓ Help"]
  ]
};
