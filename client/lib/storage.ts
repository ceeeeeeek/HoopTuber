// lib/storage.ts
import "server-only";

export const storage = {
  // Flip this later when you wire S3/R2/Firebase
  enabled: false,

  // Matches the shape of an upload call: returns an object with a URL string
  async putObject(path: string, blob: Blob, contentType: string) {
    // No real upload in no-storage mode — return a data URL for now
    const ab = await blob.arrayBuffer();
    const b64 = Buffer.from(ab).toString("base64");
    // Return a data URL so callers get a “URL” without any external service.
    return { url: `data:${contentType};base64,${b64}` };
  },
};
