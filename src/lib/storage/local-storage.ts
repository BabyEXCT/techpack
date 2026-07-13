import fs from "node:fs/promises";
import path from "node:path";
import { StorageAdapter } from "./storage";

function safeFilename(original: string) {
  const base = path.basename(original);
  return base.replace(/[^\w.\-()\s]/g, "_");
}

export class LocalStorageAdapter implements StorageAdapter {
  async save(file: File, folder: string) {
    const root = process.env.UPLOAD_ROOT ?? "./uploads";
    const dir = path.join(root, folder);
    await fs.mkdir(dir, { recursive: true });

    const originalName = safeFilename(file.name);
    const uniqueName = `${Date.now()}-${originalName}`;
    const outputPath = path.join(dir, uniqueName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(outputPath, buffer);

    return {
      storagePath: outputPath,
      originalName: file.name,
      mimeType: file.type
    };
  }
}

