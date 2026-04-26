import { db, lawArticlesTable, type LawArticle } from "@workspace/db";
import { sql, asc, inArray, eq } from "drizzle-orm";

let cachedIndex: { id: number; source: string; articleNumber: string; summary: string }[] | null =
  null;

export async function getArticleIndex(): Promise<
  { id: number; source: string; articleNumber: string; summary: string }[]
> {
  if (cachedIndex) return cachedIndex;
  const rows = await db
    .select({
      id: lawArticlesTable.id,
      source: lawArticlesTable.source,
      articleNumber: lawArticlesTable.articleNumber,
      summary: lawArticlesTable.summary,
      content: lawArticlesTable.content,
      chapterTitle: lawArticlesTable.chapterTitle,
    })
    .from(lawArticlesTable)
    .orderBy(asc(lawArticlesTable.orderIndex));
  cachedIndex = rows.map((r) => ({
    id: r.id,
    source: r.source,
    articleNumber: r.articleNumber,
    summary:
      (r.summary && r.summary.length > 0
        ? r.summary
        : (r.content || "").replace(/\s+/g, " ").slice(0, 220)) +
      (r.chapterTitle ? ` [${r.chapterTitle}]` : ""),
  }));
  return cachedIndex;
}

export function clearArticleIndexCache(): void {
  cachedIndex = null;
}

export async function getArticlesByIds(ids: number[]): Promise<LawArticle[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select()
    .from(lawArticlesTable)
    .where(inArray(lawArticlesTable.id, ids));
  return rows;
}

export async function searchArticles(
  query: string | undefined,
  source: string | undefined,
  limit: number,
): Promise<LawArticle[]> {
  const conditions = [];
  if (source) conditions.push(eq(lawArticlesTable.source, source));
  if (query && query.trim()) {
    const q = `%${query.trim()}%`;
    conditions.push(
      sql`(${lawArticlesTable.content} ILIKE ${q} OR ${lawArticlesTable.summary} ILIKE ${q} OR ${lawArticlesTable.articleNumber} ILIKE ${q})`,
    );
  }
  const where =
    conditions.length === 0 ? undefined : sql.join(conditions, sql` AND `);
  const rows = await db
    .select()
    .from(lawArticlesTable)
    .where(where)
    .orderBy(asc(lawArticlesTable.orderIndex))
    .limit(limit);
  return rows;
}
