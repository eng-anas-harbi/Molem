import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  chatConversationsTable,
  chatMessagesTable,
  type ChatCitation,
} from "@workspace/db";
import { eq, and, desc, asc } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../lib/auth";
import {
  answerLegalQuestion,
  generateConversationTitle,
  type ChatHistoryItem,
} from "../lib/chat";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/conversations", async (req: Request, res: Response) => {
  const { userId } = (req as AuthedRequest).user;
  const rows = await db
    .select()
    .from(chatConversationsTable)
    .where(eq(chatConversationsTable.userId, userId))
    .orderBy(desc(chatConversationsTable.updatedAt));
  res.json(rows);
});

router.get("/conversations/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "معرّف غير صالح" });
    return;
  }
  const { userId } = (req as AuthedRequest).user;
  const [conv] = await db
    .select()
    .from(chatConversationsTable)
    .where(
      and(eq(chatConversationsTable.id, id), eq(chatConversationsTable.userId, userId)),
    )
    .limit(1);
  if (!conv) {
    res.status(404).json({ error: "المحادثة غير موجودة" });
    return;
  }
  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.conversationId, conv.id))
    .orderBy(asc(chatMessagesTable.createdAt));
  res.json({ conversation: conv, messages });
});

router.delete("/conversations/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "معرّف غير صالح" });
    return;
  }
  const { userId } = (req as AuthedRequest).user;
  const result = await db
    .delete(chatConversationsTable)
    .where(
      and(eq(chatConversationsTable.id, id), eq(chatConversationsTable.userId, userId)),
    )
    .returning({ id: chatConversationsTable.id });
  if (result.length === 0) {
    res.status(404).json({ error: "المحادثة غير موجودة" });
    return;
  }
  res.status(204).end();
});

router.post("/messages", async (req: Request, res: Response) => {
  const { userId } = (req as AuthedRequest).user;
  const body = req.body as { message?: unknown; conversationId?: unknown };
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length < 2) {
    res.status(400).json({ error: "الرسالة قصيرة جداً" });
    return;
  }
  let conversationId: number | null =
    typeof body.conversationId === "number" && Number.isFinite(body.conversationId)
      ? body.conversationId
      : null;

  // Resolve or create the conversation
  let conversation:
    | typeof chatConversationsTable.$inferSelect
    | undefined;
  if (conversationId !== null) {
    [conversation] = await db
      .select()
      .from(chatConversationsTable)
      .where(
        and(
          eq(chatConversationsTable.id, conversationId),
          eq(chatConversationsTable.userId, userId),
        ),
      )
      .limit(1);
    if (!conversation) {
      res.status(404).json({ error: "المحادثة غير موجودة" });
      return;
    }
  } else {
    const title = await generateConversationTitle(message);
    [conversation] = await db
      .insert(chatConversationsTable)
      .values({ userId, title })
      .returning();
    conversationId = conversation.id;
  }

  // Load history (before inserting the new user message)
  const priorMessages = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.conversationId, conversation.id))
    .orderBy(asc(chatMessagesTable.createdAt));

  const history: ChatHistoryItem[] = priorMessages.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

  // Insert the user message
  const [userMsg] = await db
    .insert(chatMessagesTable)
    .values({
      conversationId: conversation.id,
      role: "user",
      content: message,
    })
    .returning();

  try {
    const result = await answerLegalQuestion(message, history);
    const citations: ChatCitation[] = Array.isArray(result.citations)
      ? result.citations
      : [];
    const [assistantMsg] = await db
      .insert(chatMessagesTable)
      .values({
        conversationId: conversation.id,
        role: "assistant",
        content: result.answer ?? "",
        citations,
      })
      .returning();
    await db
      .update(chatConversationsTable)
      .set({ updatedAt: new Date() })
      .where(eq(chatConversationsTable.id, conversation.id));
    res.json({
      conversation,
      userMessage: userMsg,
      assistantMessage: assistantMsg,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "تعذّر توليد الإجابة";
    req.log.error({ err }, "Chat answer failed");
    res.status(500).json({
      conversation,
      userMessage: userMsg,
      error: msg,
    });
  }
});

export default router;
