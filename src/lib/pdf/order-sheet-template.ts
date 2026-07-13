import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { toPdfSafeText } from "./pdf-text";
import { buildSizeTotals } from "@/lib/jobs/size-totals";

export type OrderSheetRosterRow = {
  name?: string | null;
  number?: string | null;
  size?: string | null;
  qty?: number | null;
  remarks?: string | null;
};

export type OrderSheetJobInput = {
  projectName: string;
  itemName?: string | null;
  roster: OrderSheetRosterRow[];
};

export async function buildOrderSheetPdf(job: OrderSheetJobInput) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4 portrait

  const titleFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);
  const pageWidth = 595;

  const colors = {
    black: rgb(0.07, 0.09, 0.13),
    border: rgb(0.82, 0.85, 0.89),
    light: rgb(0.97, 0.98, 0.99),
    muted: rgb(0.4, 0.45, 0.51),
    white: rgb(1, 1, 1)
  };

  const totals = buildSizeTotals(job.roster);
  const totalQty = Object.values(totals).reduce((sum, value) => sum + value, 0);

  page.drawRectangle({
    x: 0,
    y: 770,
    width: pageWidth,
    height: 72,
    color: colors.black
  });

  page.drawText("ORDER SHEET", {
    x: 40,
    y: 800,
    size: 22,
    font: titleFont,
    color: colors.white
  });
  page.drawText(toPdfSafeText(job.projectName, 60) || "-", {
    x: 40,
    y: 780,
    size: 12,
    font: bodyFont,
    color: colors.white
  });
  if (job.itemName?.trim()) {
    page.drawText(`ITEM SECTION : ${toPdfSafeText(job.itemName.trim(), 36)}`, {
      x: 40,
      y: 764,
      size: 10,
      font: titleFont,
      color: colors.white
    });
  }
  page.drawText(`Total qty: ${totalQty}`, {
    x: 455,
    y: 792,
    size: 12,
    font: titleFont,
    color: colors.white
  });

  const totalsText = Object.entries(totals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([size, qty]) => `${size}: ${qty}`)
    .join("   ");
  page.drawText(toPdfSafeText(totalsText, 90), {
    x: 40,
    y: 748,
    size: 10,
    font: bodyFont,
    color: colors.muted
  });

  let y = 705;
  const tableX = 28;
  const tableWidth = 539;
  const rowHeight = 22;
  const col = { row: 38, name: 76, number: 265, size: 328, qty: 385, remarks: 438 };

  page.drawRectangle({
    x: tableX,
    y: y - 6,
    width: tableWidth,
    height: 24,
    color: colors.black
  });

  page.drawText("#", { x: col.row, y, size: 10, font: titleFont, color: colors.white });
  page.drawText("NAME", { x: col.name, y, size: 10, font: titleFont, color: colors.white });
  page.drawText("NO.", { x: col.number, y, size: 10, font: titleFont, color: colors.white });
  page.drawText("SIZE", { x: col.size, y, size: 10, font: titleFont, color: colors.white });
  page.drawText("QTY", { x: col.qty, y, size: 10, font: titleFont, color: colors.white });
  page.drawText("REMARKS", { x: col.remarks, y, size: 10, font: titleFont, color: colors.white });

  y -= 26;

  const rows = job.roster.slice(0, 26);
  rows.forEach((row, index) => {
    const rowY = y - index * rowHeight;

    page.drawRectangle({
      x: tableX,
      y: rowY - 6,
      width: tableWidth,
      height: rowHeight,
      color: index % 2 === 0 ? colors.light : colors.white,
      borderColor: colors.border,
      borderWidth: 1
    });

    page.drawText(String(index + 1), {
      x: col.row,
      y: rowY,
      size: 9,
      font: bodyFont
    });
    page.drawText(toPdfSafeText(row.name ?? "", 24) || "-", {
      x: col.name,
      y: rowY,
      size: 9,
      font: bodyFont
    });
    page.drawText(toPdfSafeText(row.number ?? "", 6) || "-", {
      x: col.number,
      y: rowY,
      size: 9,
      font: bodyFont
    });
    page.drawText(toPdfSafeText(row.size ?? "", 6) || "-", {
      x: col.size,
      y: rowY,
      size: 9,
      font: bodyFont
    });
    page.drawText(String(row.qty ?? 1), {
      x: col.qty,
      y: rowY,
      size: 9,
      font: bodyFont
    });
    page.drawText(toPdfSafeText(row.remarks ?? "", 20) || "-", {
      x: col.remarks,
      y: rowY,
      size: 9,
      font: bodyFont
    });
  });

  return Buffer.from(await pdf.save());
}
