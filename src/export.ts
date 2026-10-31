import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export async function exportText(text: string, filename: string, mimeType: string) {
  if (Capacitor.isNativePlatform()) {
    const file = await Filesystem.writeFile({
      path: filename.replace(/[^a-zA-Z0-9._-]/g, '_'),
      directory: Directory.Cache,
      data: text,
      encoding: Encoding.UTF8,
    });
    // Android's share sheet lets the user choose the destination; cache files need no storage permission.
    await Share.share({ title: filename, files: [file.uri], dialogTitle: 'Export your document' });
    return;
  }
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
