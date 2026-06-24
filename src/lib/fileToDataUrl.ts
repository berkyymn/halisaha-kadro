export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Persistable data URL from a temporary blob: URL. */
export async function blobUrlToDataUrl(blobUrl: string): Promise<string> {
  const res = await fetch(blobUrl);
  if (!res.ok) throw new Error("Görsel okunamadı.");
  const blob = await res.blob();
  try {
    return await fileToDataUrl(
      new File([blob], "image.png", { type: blob.type || "image/png" })
    );
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}
