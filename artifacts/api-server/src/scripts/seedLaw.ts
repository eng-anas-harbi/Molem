/**
 * One-time script to extract Saudi Labor Law + Executive Regulations from PDFs
 * and seed them into the law_articles table.
 *
 * Usage: pnpm --filter @workspace/api-server run seed:law
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { db, lawArticlesTable, type InsertLawArticle } from "@workspace/db";
import { extractTextFromPdf } from "../lib/pdf";

interface ParsedArticle {
  source: "law" | "regulation";
  articleNumber: string;
  articleLabel: string | null;
  bookTitle: string | null;
  chapterTitle: string | null;
  sectionTitle: string | null;
  content: string;
  orderIndex: number;
}

const ARABIC_DIGIT_MAP: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};
function arabicToEnglishDigits(s: string): string {
  return s.replace(/[٠-٩]/g, (d) => ARABIC_DIGIT_MAP[d] ?? d);
}

const ONES: Record<string, number> = {
  "الأولى": 1, "الاولى": 1, "الأول": 1, "الاول": 1,
  "الثانية": 2, "الثاني": 2,
  "الثالثة": 3, "الثالث": 3,
  "الرابعة": 4, "الرابع": 4,
  "الخامسة": 5, "الخامس": 5,
  "السادسة": 6, "السادس": 6,
  "السابعة": 7, "السابع": 7,
  "الثامنة": 8, "الثامن": 8,
  "التاسعة": 9, "التاسع": 9,
  "العاشرة": 10, "العاشر": 10,
  "الحادية": 1, "الحادي": 1,
};

const TENS: Record<string, number> = {
  "العشرون": 20, "العشرين": 20,
  "الثلاثون": 30, "الثلاثين": 30,
  "الأربعون": 40, "الأربعين": 40, "والأربعون": 40, "واألربعون": 40,
  "الخمسون": 50, "الخمسين": 50,
  "الستون": 60, "الستين": 60,
  "السبعون": 70, "السبعين": 70,
  "الثمانون": 80, "الثمانين": 80,
  "التسعون": 90, "التسعين": 90,
  "المائة": 100, "المائتان": 200, "المائتين": 200,
  "ثلاثمائة": 300,
};

const HUNDREDS: Record<string, number> = {
  "بعدالمائة": 100,
  "بعدالمائتين": 200,
  "بعدالمائتان": 200,
};

function parseArabicOrdinalToNumber(header: string): number | null {
  // Normalize: collapse whitespace, normalize alif variants
  const norm = header
    .replace(/أ|إ|آ|ٱ/g, "ا")
    .replace(/\s+/g, " ")
    .replace(/[():،.\-«»"']/g, " ")
    .trim();

  // Try direct digit
  const digitMatch = arabicToEnglishDigits(norm).match(/\d+/);
  if (digitMatch) return Number(digitMatch[0]);

  const tokens = norm.split(/\s+/);
  // Find ones, tens, hundreds parts
  let ones = 0;
  let tens = 0;
  let hundreds = 0;
  let foundOrdinal = false;

  // We allow "بعد المائة" or "بعد المائتين" (after one/two hundred)
  // detect "بعد" followed by hundreds keyword
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const tNorm = t.replace(/^و/, ""); // strip leading waw
    if (ONES[t] != null) {
      ones = ONES[t];
      foundOrdinal = true;
    } else if (ONES[tNorm] != null) {
      ones = ONES[tNorm];
      foundOrdinal = true;
    } else if (TENS[t] != null) {
      tens = TENS[t];
      foundOrdinal = true;
    } else if (TENS[tNorm] != null) {
      tens = TENS[tNorm];
      foundOrdinal = true;
    } else if (/^عشرة?$/.test(t) || /^عشر$/.test(t)) {
      // teen marker: "الحادية عشرة" → 11; ones already set to 1
      tens = 10;
      foundOrdinal = true;
    } else if (t === "بعد" && i + 1 < tokens.length) {
      const next = tokens[i + 1];
      if (/مائتي/.test(next) || /مائتان/.test(next)) {
        hundreds = 200;
      } else if (/مائة/.test(next)) {
        hundreds = 100;
      } else if (/ثلاثمائة/.test(next)) {
        hundreds = 300;
      }
      i++;
    } else if (HUNDREDS[t] != null) {
      hundreds = HUNDREDS[t];
    }
  }

  if (!foundOrdinal && hundreds === 0) return null;
  return hundreds + tens + ones;
}

function parseArticles(
  rawText: string,
  source: "law" | "regulation",
  startOrder: number,
): ParsedArticle[] {
  const text = rawText.replace(/\r\n/g, "\n").replace(/\u00A0/g, " ");

  // Split by article marker. Match "المادة" or "مادة" preceded by start/newline/space
  // and followed by space or colon (not by an Arabic letter, so we don't match
  // "المادتين" / "المواد").
  const re = /(?:^|\n|\s)((?:ال)?مادة)(?=[\s:\u061B])/g;
  const positions: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    // Position points to the start of "مادة" / "المادة"
    const wordStart = m.index + m[0].length - m[1].length;
    positions.push(wordStart);
  }
  if (positions.length === 0) return [];

  // For each match, the chunk from this position to the next position is one article block.
  // The first ~80 chars after "مادة" form the header (containing the ordinal),
  // followed by a ":" or newline, then the body.
  let bookTitle: string | null = null;
  let chapterTitle: string | null = null;
  let sectionTitle: string | null = null;

  const updateHeadings = (chunk: string) => {
    const lines = chunk
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && l.length < 200);
    for (const line of lines) {
      if (/^الباب\s+/.test(line)) bookTitle = line;
      else if (/^الفصل\s+/.test(line)) chapterTitle = line;
      else if (/^المبحث\s+/.test(line) || /^القسم\s+/.test(line))
        sectionTitle = line;
    }
  };

  // Pre-scan
  updateHeadings(text.slice(0, positions[0]));

  const articles: ParsedArticle[] = [];
  let seq = 0;
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i];
    const end = i + 1 < positions.length ? positions[i + 1] : text.length;
    const block = text.slice(start, end);
    if (i > 0) {
      updateHeadings(text.slice(positions[i - 1], start));
    }

    // Skip the leading "المادة" / "مادة"
    const afterMarker = block.replace(/^\s*(?:ال)?مادة\s*/, "");
    // Header is up to the first ":" or newline
    let headerEnd = afterMarker.search(/[:\n\u061B]/);
    if (headerEnd < 0) headerEnd = Math.min(80, afterMarker.length);
    const header = afterMarker.slice(0, headerEnd).trim();
    let body = afterMarker.slice(headerEnd + 1).trim();

    // Skip junk matches (likely "المواد" in the middle of a sentence)
    if (header.length === 0 || header.length > 80) continue;
    if (body.length < 30) continue;

    // Strip page-number footers
    body = body
      .replace(/\n\s*\d+\s*\/?\s*\d*\s*$/g, "")
      .trim();

    seq++;
    const num = parseArabicOrdinalToNumber(header);
    const articleNumber = num != null ? String(num) : `seq-${seq}`;

    articles.push({
      source,
      articleNumber,
      articleLabel: `المادة ${header}`.slice(0, 200),
      bookTitle,
      chapterTitle,
      sectionTitle,
      content: body,
      orderIndex: startOrder + seq,
    });
  }
  return articles;
}

async function main(): Promise<void> {
  const lawPath = resolve(
    process.cwd(),
    "../..",
    "attached_assets",
    "work_system_1777225352392.pdf",
  );
  const regPath = resolve(
    process.cwd(),
    "../..",
    "attached_assets",
    "نظام_العمل_ولوائحه_التنفيذية_1777225356946.pdf",
  );

  console.log("Reading Saudi Labor Law PDF...");
  const lawBuf = readFileSync(lawPath);
  const lawText = await extractTextFromPdf(lawBuf);
  console.log(`Extracted ${lawText.length} chars from law PDF.`);

  console.log("Reading Executive Regulations PDF...");
  const regBuf = readFileSync(regPath);
  const regText = await extractTextFromPdf(regBuf);
  console.log(`Extracted ${regText.length} chars from regulations PDF.`);

  const lawArticles = parseArticles(lawText, "law", 0);
  console.log(`Parsed ${lawArticles.length} law articles.`);

  const regArticles = parseArticles(regText, "regulation", 100000);
  console.log(`Parsed ${regArticles.length} regulation articles.`);

  const allArticles = [...lawArticles, ...regArticles];
  if (allArticles.length === 0) {
    throw new Error("No articles parsed — check PDF parsing.");
  }

  console.log(`Total articles to insert: ${allArticles.length}`);

  await db.delete(lawArticlesTable);
  console.log("Cleared existing law_articles rows.");

  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < allArticles.length; i += BATCH) {
    const slice = allArticles.slice(i, i + BATCH);
    const rows: InsertLawArticle[] = slice.map((a) => ({
      source: a.source,
      bookTitle: a.bookTitle?.slice(0, 300) ?? null,
      chapterTitle: a.chapterTitle?.slice(0, 300) ?? null,
      sectionTitle: a.sectionTitle?.slice(0, 300) ?? null,
      articleNumber: a.articleNumber.slice(0, 50),
      articleLabel: a.articleLabel?.slice(0, 200) ?? null,
      content: a.content,
      summary: a.content.replace(/\s+/g, " ").slice(0, 240),
      orderIndex: a.orderIndex,
    }));
    await db.insert(lawArticlesTable).values(rows);
    inserted += rows.length;
    console.log(`  Inserted ${inserted}/${allArticles.length}`);
  }

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
