import type { LocalAssetFile, SectionUploadedFile } from "./local-jobs";

export type ItemAssetSet = {
  mockupFiles?: LocalAssetFile[];
  artworkCutPieces?: LocalAssetFile[];
  colorConfirmationFiles?: LocalAssetFile[];
};

export function splitSectionFilesByLabel(files: SectionUploadedFile[] = []) {
  return {
    mockups: files.filter((file) => file.chosenLabel === "mockup"),
    cutPieces: files.filter((file) => file.chosenLabel === "cutpiece"),
    colorCodes: files.filter((file) => file.chosenLabel === "colorcode")
  };
}

export function resolveMockupFiles(mockups: SectionUploadedFile[] = []) {
  const combined = mockups.filter((file) => file.mockupVariant === "combined");
  if (combined.length) return combined;

  const frontBack = mockups.filter((file) => file.mockupVariant === "front" || file.mockupVariant === "back");
  if (frontBack.length) return frontBack;

  return mockups.slice(0, 1);
}

export function resolveItemMockup(
  sectionMockupFiles: LocalAssetFile[] = [],
  sharedMockupFiles: LocalAssetFile[] = []
) {
  return sectionMockupFiles.length ? sectionMockupFiles : sharedMockupFiles;
}
