// Getting files off the phone: the share sheet when the browser supports sharing files, else a download.

export function download(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export const canShareFile = (file: File): boolean => !!navigator.canShare?.({ files: [file] });

/** Opens the share sheet for a file; falls back to downloading it. Returns false if the user cancelled. */
export async function shareFile(file: File, title?: string): Promise<boolean> {
  if (canShareFile(file)) {
    try {
      await navigator.share({ files: [file], title });
      return true;
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return false;
    }
  }
  download(file);
  return true;
}

export const fileStamp = (): string => new Date().toISOString().slice(0, 10);
