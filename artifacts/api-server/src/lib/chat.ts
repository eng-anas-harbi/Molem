import { ai } from "@workspace/integrations-gemini-ai";
import { getArticleIndex, getArticlesByIds } from "./lawIndex";
import type { ChatCitation } from "@workspace/db";

const MODEL = "gemini-2.5-flash";

export interface ChatHistoryItem {
  role: "user" | "assistant";
  content: string;
}

export interface ChatAnswer {
  answer: string;
  citations: ChatCitation[];
}

function safeJsonParse<T>(text: string): T {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
  }
  return JSON.parse(cleaned) as T;
}

async function generateJson<T>(
  systemPrompt: string,
  userPrompt: string,
  schema?: object,
): Promise<T> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      ...(schema ? { responseSchema: schema } : {}),
      temperature: 0.3,
    },
  });
  const text = response.text ?? "";
  if (!text) throw new Error("Empty response from Gemini");
  return safeJsonParse<T>(text);
}

function formatHistory(history: ChatHistoryItem[]): string {
  if (history.length === 0) return "";
  const last = history.slice(-6);
  return last
    .map((m) => (m.role === "user" ? `المستخدم: ${m.content}` : `المساعد: ${m.content}`))
    .join("\n\n");
}

async function pickArticlesForQuestion(
  question: string,
  history: ChatHistoryItem[],
): Promise<number[]> {
  const index = await getArticleIndex();
  if (index.length === 0) return [];

  const indexLines = index
    .map((a) => `#${a.id} [${a.source}/مادة ${a.articleNumber}] ${a.summary}`)
    .join("\n");

  const sys = `أنت مساعد قانوني سعودي. مهمتك اختيار المواد الأكثر صلة بسؤال المستخدم من فهرس مواد نظام العمل السعودي ولوائحه التنفيذية. أعد JSON فقط.`;

  const historyBlock = formatHistory(history);

  const user = `فهرس المواد المتاحة (كل سطر: #<معرّف> [<المصدر>/مادة <رقم>] <ملخص>):

${indexLines}

${historyBlock ? `سجل المحادثة السابقة:\n${historyBlock}\n\n` : ""}سؤال المستخدم الحالي:
"""
${question.slice(0, 4000)}
"""

اختر بين 5 و 15 مادة هي الأكثر صلة بالإجابة على هذا السؤال (مع مراعاة سياق المحادثة إن وُجد). أعد JSON فقط:
{ "articleIds": [<معرّف>, <معرّف>, ...] }`;

  type Resp = { articleIds: number[] };
  const result = await generateJson<Resp>(sys, user, {
    type: "object",
    properties: {
      articleIds: { type: "array", items: { type: "integer" } },
    },
    required: ["articleIds"],
  });

  const validIds = new Set(index.map((a) => a.id));
  return (result.articleIds || []).filter((id) => validIds.has(id)).slice(0, 20);
}

async function performAnswer(
  question: string,
  history: ChatHistoryItem[],
  articleIds: number[],
): Promise<ChatAnswer> {
  const articles = await getArticlesByIds(articleIds);
  const articlesText = articles
    .map(
      (a) =>
        `[المرجع: ${a.source}-${a.articleNumber} | المعرّف: ${a.id}]
المصدر: ${a.source === "law" ? "نظام العمل" : "اللائحة التنفيذية"}
رقم المادة: ${a.articleNumber}
نص المادة: ${a.content}`,
    )
    .join("\n\n---\n\n");

  const sys = `أنت "مُلِم"، مساعد قانوني سعودي متخصص في نظام العمل ولوائحه التنفيذية. تجيب على أسئلة الناس العاديين (موظفين وأصحاب عمل) بلغة بسيطة جداً ومباشرة.

مبادئك:
1. تحدّث بالعربية الفصحى المبسّطة وكأنك تشرح لصديقك.
2. تجنّب المصطلحات القانونية المعقّدة، أو اشرحها فوراً إن استخدمتها.
3. كل ادّعاء قانوني يجب أن يستند إلى مادة محدّدة من المواد المرجعية المُزوَّدة لك.
4. إذا لم تجد إجابة في المواد المرجعية، قل بصراحة: "هذا السؤال يحتاج استشارة محامٍ مختص" بدل التخمين.
5. كن محايداً: إذا كان السؤال من موظف اشرح حقوقه وواجباته، وكذلك إذا كان من صاحب عمل.
6. لا تقدّم نصيحة قانونية ملزمة، بل توضيحاً تثقيفياً.
7. أعد JSON صالحاً فقط، بدون أي نص خارج JSON.`;

  const historyBlock = formatHistory(history);

  const user = `${historyBlock ? `سجل المحادثة السابقة:\n${historyBlock}\n\n` : ""}سؤال المستخدم الحالي:
"""
${question}
"""

المواد القانونية المرجعية المختارة:
${articlesText}

أجب على السؤال وأعد JSON بهذا الشكل حرفياً:
{
  "answer": "<إجابة واضحة ومبسّطة، استخدم فقرات قصيرة وقوائم نقطية عند الحاجة. اذكر مراجع المواد داخل النص بصيغة (نظام العمل-المادة 75) أو (اللائحة-المادة 12).>",
  "citations": [
    {
      "source": "law|regulation",
      "articleNumber": "<رقم المادة>",
      "label": "<عنوان مختصر>",
      "snippet": "<مقتطف قصير من نص المادة، جملة أو جملتان>"
    }
  ]
}

تعليمات:
- اجعل citations يحتوي فقط المواد التي استشهدت بها فعلاً في answer.
- اجعل source قيمة واحدة من: "law" أو "regulation" حسب ما ورد بين قوسين [المرجع: ...] في المواد أعلاه.`;

  return generateJson<ChatAnswer>(sys, user);
}

export async function answerLegalQuestion(
  question: string,
  history: ChatHistoryItem[],
): Promise<ChatAnswer> {
  if (!question || question.trim().length < 3) {
    throw new Error("السؤال قصير جداً.");
  }
  const articleIds = await pickArticlesForQuestion(question, history);
  if (articleIds.length === 0) {
    throw new Error(
      "تعذّر العثور على مواد قانونية مرجعية. تأكّد من تشغيل سكربت تحميل نظام العمل (seedLaw).",
    );
  }
  return performAnswer(question, history, articleIds);
}

export async function generateConversationTitle(firstMessage: string): Promise<string> {
  const trimmed = firstMessage.trim().slice(0, 200);
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: trimmed }] }],
      config: {
        systemInstruction:
          "أعد عنواناً قصيراً جداً (بحد أقصى 6 كلمات) باللغة العربية يلخّص موضوع السؤال التالي. أعد العنوان فقط بدون اقتباس أو شرح أو علامات ترقيم زائدة.",
        temperature: 0.4,
      },
    });
    const text = (response.text ?? "").trim().replace(/^["'«]|["'»]$/g, "");
    if (text && text.length <= 80) return text;
  } catch {
    /* fall through */
  }
  return trimmed.split(/\s+/).slice(0, 6).join(" ") || "محادثة جديدة";
}
