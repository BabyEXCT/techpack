import { db } from "../db";
import { sendMessage, MENU_KEYBOARD } from "./send";
import { fillTemplate } from "./templates";

const WELCOME = `Techpack bot ready. Commands:
/start - show this
/summary - job counts by stage
/urgent - urgent & rush jobs
/today - jobs due today
/create - create job from pasted text
/template <name> [project] - customer-ready message`;

export async function handleStart(chatId: string): Promise<void> {
  await sendMessage(chatId, WELCOME, MENU_KEYBOARD);
}

export async function handleSummary(chatId: string): Promise<void> {
  const stages = ["NEW", "DESIGN", "WAITING_APPROVAL", "PRODUCTION", "DONE"] as const;
  const lines = await Promise.all(
    stages.map(async (s) => {
      const count = await db.job.count({ where: { workflowStage: s, deletedAt: null } });
      return `${s}: ${count}`;
    })
  );
  await sendMessage(chatId, `📊 Summary\n${lines.join("\n")}`);
}

export async function handleUrgent(chatId: string): Promise<void> {
  const jobs = await db.job.findMany({
    where: { priority: { in: ["URGENT", "RUSH"] }, deletedAt: null },
    select: { projectName: true, priority: true }
  });
  if (!jobs.length) {
    await sendMessage(chatId, "No urgent or rush jobs.");
    return;
  }
  const lines = jobs.map((j) => `- ${j.projectName} (${j.priority})`);
  await sendMessage(chatId, `⚡ Urgent/Rush\n${lines.join("\n")}`);
}

export async function handleToday(chatId: string): Promise<void> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const jobs = await db.job.findMany({
    where: { deliveryDate: { gte: todayStart, lt: todayEnd }, deletedAt: null },
    select: { projectName: true, deliveryDate: true }
  });
  if (!jobs.length) {
    await sendMessage(chatId, "Nothing due today.");
    return;
  }
  const lines = jobs.map((j) => `- ${j.projectName} (${j.deliveryDate?.toLocaleDateString() ?? ""})`);
  await sendMessage(chatId, `📅 Today\n${lines.join("\n")}`);
}

export async function handleTemplate(chatId: string, arg: string): Promise<void> {
  const [name, ...rest] = arg.trim().split(/\s+/);
  const project = rest.join(" ");
  const tpl = await db.messageTemplate.findUnique({ where: { name } });
  if (!tpl) {
    await sendMessage(chatId, `Template "${name}" not found.`);
    return;
  }
  let job = null;
  if (project) {
    job = await db.job.findFirst({
      where: { projectName: { contains: project }, deletedAt: null },
      orderBy: { createdAt: "desc" }
    });
  }
  await sendMessage(chatId, fillTemplate(tpl.body, job));
}
