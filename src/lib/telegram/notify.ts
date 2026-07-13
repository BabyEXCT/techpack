import { sendMessage, adminChatId } from "./send";

async function push(text: string): Promise<void> {
  const chatId = adminChatId();
  if (!chatId) return;
  try {
    await sendMessage(chatId, text);
  } catch (err) {
    console.error("Telegram notify failed:", err);
  }
}

export function notifyJobCreated(projectName: string, priority: string): Promise<void> {
  return push(`🆕 New job: ${projectName} (${priority})`);
}

export function notifyStageChange(projectName: string, stage: string): Promise<void> {
  return push(`🔄 ${projectName} moved to ${stage}`);
}

export function notifyPriorityChange(projectName: string, priority: string): Promise<void> {
  return push(`⚡ ${projectName} marked as ${priority}`);
}

export function notifyPaymentStatus(invoiceNumber: string, status: string): Promise<void> {
  return push(`💰 Invoice ${invoiceNumber} is now ${status}`);
}

export function notifyNewCustomer(name: string): Promise<void> {
  return push(`👤 New customer: ${name}`);
}
