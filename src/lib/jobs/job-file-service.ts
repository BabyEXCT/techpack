import fs from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { LocalStorageAdapter } from "@/lib/storage/local-storage";

export type UploadFileKind = "MOCKUP" | "LOGO" | "ARTWORK";

export async function saveJobFiles(jobId: string, kind: UploadFileKind, files: File[]) {
  const storage = new LocalStorageAdapter();

  await db.uploadedFile.deleteMany({
    where: { jobId, kind }
  });

  if (!files.length) {
    return;
  }

  const saved = await Promise.all(files.map((file) => storage.save(file, path.join(jobId, kind.toLowerCase()))));

  await db.uploadedFile.createMany({
    data: saved.map((file) => ({
      jobId,
      kind,
      originalName: file.originalName,
      storagePath: file.storagePath,
      mimeType: file.mimeType
    }))
  });
}

export async function loadJobFilesAsDataUrls(
  files: Array<{ originalName: string; storagePath: string; mimeType: string }>
) {
  return Promise.all(
    files.map(async (file) => {
      const data = await fs.readFile(file.storagePath);
      return {
        name: file.originalName,
        dataUrl: `data:${file.mimeType};base64,${data.toString("base64")}`
      };
    })
  );
}

