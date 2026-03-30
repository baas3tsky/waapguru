/**
 * Client-side Download Helper
 * Utility functions for downloading files in the browser
 */

/**
 * Trigger download in browser
 * @param url - The blob URL or data URL to download
 * @param filename - The filename to save as
 */
export function downloadFile(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Create a downloadable blob URL from text content
 * @param content - The text content to download
 * @param mimeType - The MIME type of the content
 * @returns Blob URL
 */
export function createBlobUrl(content: string, mimeType: string): string {
  const blob = new Blob([content], { type: mimeType });
  return URL.createObjectURL(blob);
}

/**
 * Download text content as a file
 * @param content - The text content to download
 * @param filename - The filename to save as
 * @param mimeType - The MIME type of the content
 */
export function downloadTextFile(
  content: string,
  filename: string,
  mimeType: string = 'text/plain'
): void {
  const url = createBlobUrl(content, mimeType);
  downloadFile(url, filename);
}
