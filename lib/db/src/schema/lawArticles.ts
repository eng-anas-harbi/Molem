import { pgTable, serial, text, varchar, integer, index } from "drizzle-orm/pg-core";

export const lawArticlesTable = pgTable(
  "law_articles",
  {
    id: serial("id").primaryKey(),
    source: varchar("source", { length: 20 }).notNull(),
    bookTitle: varchar("book_title", { length: 300 }),
    chapterTitle: varchar("chapter_title", { length: 300 }),
    sectionTitle: varchar("section_title", { length: 300 }),
    articleNumber: varchar("article_number", { length: 50 }).notNull(),
    articleLabel: varchar("article_label", { length: 200 }),
    content: text("content").notNull(),
    summary: text("summary"),
    keywords: text("keywords"),
    orderIndex: integer("order_index").notNull().default(0),
  },
  (t) => [
    index("law_articles_source_idx").on(t.source),
    index("law_articles_order_idx").on(t.orderIndex),
  ],
);

export type LawArticle = typeof lawArticlesTable.$inferSelect;
export type InsertLawArticle = typeof lawArticlesTable.$inferInsert;
