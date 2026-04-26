import { createRequire } from "node:module";
import mammoth from "mammoth";

const require = createRequire(import.meta.url);
type PdfParseFn = (
  data: Buffer,
  options?: Record<string, unknown>,
) => Promise<{ text: string; numpages: number }>;

let pdfParseCached: PdfParseFn | null = null;

function loadPdfParse(): PdfParseFn {
  if (!pdfParseCached) {
    pdfParseCached = require("pdf-parse/lib/pdf-parse.js") as PdfParseFn;
  }
  return pdfParseCached;
}

// Many Arabic-script PDFs are stored in visual order (each "word" is reversed
// character-by-character). Detect this by looking for the reversed form of
// the very common word "المادة" → "ةداملا" or "العمل" → "لمعلا". If found, we
// reverse all Arabic-only tokens to recover logical order. Latin/digit tokens
// are left untouched.
function looksReversedArabic(text: string): boolean {
  const sample = text.slice(0, 4000);
  const reversedHits =
    (sample.match(/ةداملا/g)?.length ?? 0) +
    (sample.match(/لمعلا/g)?.length ?? 0) +
    (sample.match(/ةكلمملا/g)?.length ?? 0);
  const normalHits =
    (sample.match(/المادة/g)?.length ?? 0) +
    (sample.match(/العمل/g)?.length ?? 0) +
    (sample.match(/المملكة/g)?.length ?? 0);
  return reversedHits > normalHits;
}

function reverseArabicTokens(text: string): string {
  return text
    .split(/(\s+)/)
    .map((t) => {
      if (/^\s+$/.test(t)) return t;
      if (/[\u0600-\u06FF]/.test(t)) return [...t].reverse().join("");
      return t;
    })
    .join("");
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const pdfParse = loadPdfParse();
  const result = await pdfParse(buffer);
  let text = result.text;
  if (looksReversedArabic(text)) {
    text = reverseArabicTokens(text);
  }
  return text;
}

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function extractTextFromFile(
  buffer: Buffer,
  mimetype: string,
  filename: string,
): Promise<string> {
  const lowerName = filename.toLowerCase();
  if (mimetype === "application/pdf" || lowerName.endsWith(".pdf")) {
    return extractTextFromPdf(buffer);
  }
  if (
    mimetype.includes("word") ||
    lowerName.endsWith(".docx") ||
    lowerName.endsWith(".doc")
  ) {
    return extractTextFromDocx(buffer);
  }
  if (mimetype.startsWith("text/")) {
    return buffer.toString("utf-8");
  }
  throw new Error(
    `Unsupported file type: ${mimetype}. Please upload PDF, DOCX, or plain text.`,
  );
}
