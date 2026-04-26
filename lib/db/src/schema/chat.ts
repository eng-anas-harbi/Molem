import { pgTable, serial, text, timestamp, integer, varchar, jsonb } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const chatConversationsTable = pgTable("chat_conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ChatConversation = typeof chatConversationsTable.$inferSelect;

export const chatCitationSchema = z.object({
  source: z.string(),
  articleNumber: z.string(),
  label: z.string().optional(),
  snippet: z.string().optional(),
});
export type ChatCitation = z.infer<typeof chatCitationSchema>;

export const chatMessagesTable = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => chatConversationsTable.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 16 }).notNull(),
  content: text("content").notNull(),
  citations: jsonb("citations").$type<ChatCitation[] | null>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ChatMessage = typeof chatMessagesTable.$inferSelect;
