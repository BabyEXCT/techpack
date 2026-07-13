type MinimalJob = {
  projectName?: string;
  category?: string;
  roster?: Array<{ name?: string | null; number?: string | null; size?: string | null }>;
  artworkFiles?: Array<unknown>;
};

export function getMissingRequiredFields(job: MinimalJob, options?: { requireArtwork?: boolean }) {
  const missing: string[] = [];

  if (!job.projectName?.trim()) missing.push("projectName");
  if (!job.category?.trim()) missing.push("category");
  if (!job.roster?.length) missing.push("roster");
  if (options?.requireArtwork && !job.artworkFiles?.length) missing.push("artworkFiles");

  return missing;
}
