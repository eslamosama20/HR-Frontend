export async function saveBlob(blob: Blob, fileName: string): Promise<void> {
  const mod = await import('file-saver');
  const saveAs = mod.saveAs ?? mod.default?.saveAs ?? mod.default ?? mod;
  // prefer named export if available
  if (typeof saveAs === 'function') {
    saveAs(blob, fileName);
    return;
  }
  // fallback: try destructured import
  const { saveAs: named } = await import('file-saver');
  named(blob, fileName);
}
