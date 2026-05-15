/**
 * PDF text extraction module.
 * Uses Zotero.PDFWorker to extract text from PDF attachments.
 */

const textCache = new Map<number, string>();

/**
 * Extract full text from a Zotero item's PDF attachment.
 * Caches result per item ID.
 */
export async function extractPaperText(item: Zotero.Item): Promise<string> {
  const itemId = item.id;

  if (textCache.has(itemId)) {
    return textCache.get(itemId)!;
  }

  Zotero.debug(`PaperNet: Extracting text for item ${itemId}`);

  // Find PDF attachment
  const attachmentIds = item.getAttachments();
  Zotero.debug(`PaperNet: Found ${attachmentIds.length} attachments`);

  let text = "";

  for (const attId of attachmentIds) {
    const att = await Zotero.Items.getAsync(attId);
    if (!att) continue;

    const contentType = att.attachmentContentType;
    const path = (att as any).getAttachmentPath?.() || (att as any).attachmentPath;

    Zotero.debug(`PaperNet: Attachment ${attId} - type: ${contentType}, path: ${path}`);

    if (contentType === "application/pdf" && path) {
      try {
        Zotero.debug(`PaperNet: Trying PDFWorker.getFullText for ${path}`);
        // Try Zotero.PDFWorker first - need to pass itemID
        text = await (Zotero as any).PDFWorker.getFullText(attId);
        Zotero.debug(`PaperNet: PDFWorker returned ${text?.length || 0} chars`);
      } catch (e: any) {
        Zotero.debug(`PaperNet: PDFWorker failed: ${e.message}`);
        // Fallback: try indexed text
        try {
          Zotero.debug(`PaperNet: Trying FullText.getIndexedText`);
          const indexed = await (Zotero as any).FullText.getIndexedText(attId);
          Zotero.debug(`PaperNet: Indexed text: ${indexed?.length || 0} chars`);
          if (indexed) {
            text = indexed;
          }
        } catch (e2: any) {
          Zotero.debug(`PaperNet: FullText.getIndexedText failed: ${e2.message}`);
          text = "";
        }
      }
      if (text) break;
    }
  }

  // Last fallback: try the item itself if it's a PDF
  if (!text) {
    const path = (item as any).getAttachmentPath?.();
    Zotero.debug(`PaperNet: Trying item itself, path: ${path}`);
    if (path) {
      try {
        text = await (Zotero as any).PDFWorker.getFullText(item.id);
      } catch {
        // ignore
      }
    }
  }

  Zotero.debug(`PaperNet: Final text length: ${text?.length || 0}`);

  // Truncate to reasonable size for API (roughly 100k chars)
  if (text.length > 100000) {
    text = text.substring(0, 100000) + "\n\n[Text truncated due to length]";
  }

  textCache.set(itemId, text);
  return text;
}

/**
 * Clear cached text for an item.
 */
export function clearCache(itemId: number) {
  textCache.delete(itemId);
}

/**
 * Check if a Zotero item has PDF attachments.
 */
export function hasPdfAttachment(item: Zotero.Item): boolean {
  const attachmentIds = item.getAttachments();
  for (const attId of attachmentIds) {
    const att = Zotero.Items.get(attId);
    if (att && att.attachmentContentType === "application/pdf") {
      return true;
    }
  }
  return false;
}

/**
 * Get item metadata for context.
 */
export function getItemMetadata(item: Zotero.Item): string {
  const parts: string[] = [];
  const title = item.getField("title");
  if (title) parts.push(`Title: ${title}`);

  const creators = item.getCreators();
  if (creators.length > 0) {
    const authors = creators
      .map((c) => `${c.firstName || ""} ${c.lastName || ""}`.trim())
      .join(", ");
    parts.push(`Authors: ${authors}`);
  }

  const year = item.getField("year");
  if (year) parts.push(`Year: ${year}`);

  const abstractNote = item.getField("abstractNote");
  if (abstractNote) parts.push(`Abstract: ${abstractNote}`);

  const doi = item.getField("DOI");
  if (doi) parts.push(`DOI: ${doi}`);

  return parts.join("\n");
}
