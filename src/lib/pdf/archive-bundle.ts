import JSZip from "jszip";

export async function buildArchiveZip(files: Array<{ name: string; data: Buffer }>) {
  const zip = new JSZip();

  for (const file of files) {
    zip.file(file.name, file.data);
  }

  return zip.generateAsync({ type: "nodebuffer" });
}

