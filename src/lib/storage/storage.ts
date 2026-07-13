export interface StorageAdapter {
  save(
    file: File,
    folder: string
  ): Promise<{ storagePath: string; originalName: string; mimeType: string }>;
}

