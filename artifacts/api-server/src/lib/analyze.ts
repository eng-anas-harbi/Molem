import { ai } from "@workspace/integrations-gemini-ai";
import { getArticleIndex, getArticlesByIds } from "./lawIndex";
import type {
  RightItem,
  AlertItem,
  CitationItem,
} from "@workspace/db";

const MODEL = "gemini-2.5-flash";

export interface AnalysisResult {
  summary: string;
  contractType: string;
  partiesDescription: string;
  employeeRights: RightItem[];
  employerRights: RightItem[];
  alerts: AlertItem[];
  citations: CitationItem[];
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
    contents: [
      { role: "user", parts: [{ text: userPrompt }] },
    ],
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      ...(schema ? { responseSchema: schema } : {}),
      temperature: 0.2,
    },
  });
  const text = response.text ?? "";
  if (!text) throw new Error("Empty response from Gemini");
  return safeJsonParse<T>(text);
}

async function pickRelevantArticles(
  contractText: string,
): Promise<number[]> {
  const index = await getArticleIndex();
  if (index.length === 0) return [];

  const indexLines = index
    .map(
      (a) =>
        `#${a.id} [${a.source}/مادة ${a.articleNumber}] ${a.summary}`,
    )
    .join("\n");

  const sys = `أنت مساعد قانوني سعودي متخصص في نظام العمل ولوائحه التنفيذية. مهمتك اختيار المواد القانونية الأكثر صلة بعقد عمل مُقدَّم لك من فهرس المواد المتاحة. أعد JSON فقط، بدون أي شرح.`;

  const user = `هذا فهرس مواد نظام العمل السعودي ولوائحه التنفيذية، كل سطر بصيغة:
#<معرّف> [<المصدر>/مادة <رقم>] <ملخص>

${indexLines}

والآن النص التالي هو عقد عمل (قد يكون مختصراً أو طويلاً):
"""
${contractText.slice(0, 12000)}
"""

اختر بين 12 و 25 مادة هي الأكثر صلة بهذا العقد، شاملةً المواد التي تنظّم: نوع العقد ومدته، الأجور، ساعات العمل، الإجازات، إنهاء العقد، التعويضات، مكافأة نهاية الخدمة، فترة التجربة، عدم المنافسة، الأمن الوظيفي، حقوق المرأة العاملة إن وُجدت، وأي بنود أخرى ظهرت في العقد.

أعد JSON فقط بهذا الشكل:
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
  return (result.articleIds || []).filter((id) => validIds.has(id)).slice(0, 30);
}

async function performAnalysis(
  contractText: string,
  articleIds: number[],
): Promise<AnalysisResult> {
  const articles = await getArticlesByIds(articleIds);
  const articlesText = articles
    .map(
      (a) =>
        `[المرجع: ${a.source}-${a.articleNumber} | المعرّف: ${a.id}]
المصدر: ${a.source === "law" ? "نظام العمل" : "اللائحة التنفيذية"}
رقم المادة: ${a.articleNumber}${a.chapterTitle ? `\nالباب/الفصل: ${a.chapterTitle}` : ""}
نص المادة: ${a.content}`,
    )
    .join("\n\n---\n\n");

  const sys = `أنت "مُلِم"، مدقق عقود العمل السعودية. أنت محامٍ خبير بنظام العمل السعودي ولوائحه التنفيذية، تشرح للناس العاديين (غير القانونيين) حقوقهم وواجباتهم بلغة بسيطة جداً ومباشرة.

مبادئك:
1. تحدّث بالعربية الفصحى المبسّطة كأنك تشرح لصديقك.
2. تجنّب المصطلحات القانونية المعقّدة، أو اشرحها فوراً إن استخدمتها.
3. ضع نفسك مكان كلّ من الموظف وصاحب العمل، وبيّن حقوق كلٍّ منهما بصدق وحياد.
4. كل ادّعاء قانوني يجب أن يستند إلى مادة محدّدة من النظام أو اللائحة التي زُوّدت بها، باستخدام مرجعها الكامل (مثال: "نظام العمل-المادة 75").
5. ميّز بوضوح بين البنود غير القانونية (تخالف نظام العمل) والبنود القانونية ولكن المُجحفة بحقّ أحد الطرفين.
6. أعد JSON صالحاً فقط، بدون أي نص خارج JSON.`;

  const user = `هذا نص عقد عمل مقدَّم من المستخدم:
"""
${contractText}
"""

وهذه المواد القانونية المرجعية المختارة:
${articlesText}

حلّل العقد وأعد JSON بالشكل التالي حرفياً:
{
  "summary": "<ملخص واضح ومبسّط للعقد في 3-5 جمل: نوعه، أطرافه، أهم نقاطه>",
  "contractType": "<نوع العقد: محدد المدة، غير محدد المدة، عقد تجربة، إلخ>",
  "partiesDescription": "<وصف مختصر للطرفين كما وردا في العقد>",
  "employeeRights": [
    {
      "title": "<عنوان حق مختصر>",
      "description": "<شرح هذا الحق بلغة بسيطة جداً، وكيف يتجلى في هذا العقد بالتحديد>",
      "citations": ["<مرجع المادة، مثال: نظام العمل-المادة 75>"]
    }
  ],
  "employerRights": [
    {
      "title": "<...>",
      "description": "<...>",
      "citations": ["<...>"]
    }
  ],
  "alerts": [
    {
      "severity": "high|medium|low",
      "clause": "<اقتباس البند أو موضعه في العقد>",
      "issue": "<شرح المشكلة بلغة بسيطة: هل هي مخالفة صريحة للنظام؟ أم مجحفة لأحد الطرفين؟ أم غامضة؟>",
      "affectedParty": "employee|employer|both",
      "recommendation": "<توصية واضحة لما يجب فعله: حذف، تعديل، توضيح، التفاوض، إلخ>",
      "citations": ["<مراجع المواد ذات العلاقة>"]
    }
  ],
  "citations": [
    {
      "ref": "<المرجع الكامل، مثال: نظام العمل-المادة 75>",
      "source": "law|regulation",
      "articleNumber": "<رقم المادة>",
      "title": "<عنوان مختصر للمادة>",
      "excerpt": "<مقتطف قصير من نص المادة، أهم جملتين فقط>"
    }
  ]
}

تعليمات إضافية مهمّة:
- ضع 4 إلى 8 حقوق للموظف، و3 إلى 6 حقوق لصاحب العمل، حسب ما يستلزمه العقد.
- إن لم توجد بنود إشكالية، اجعل alerts مصفوفة فارغة [].
- اجعل citations يحتوي كل المواد التي استشهدت بها فعلاً في employeeRights و employerRights و alerts.
- لكل citation استخدم مرجعاً متطابقاً تماماً مع ما ورد بين قوسين [المرجع: ...] في المواد أعلاه.`;

  return generateJson<AnalysisResult>(sys, user);
}

export async function analyzeContract(
  contractText: string,
): Promise<AnalysisResult> {
  if (!contractText || contractText.trim().length < 20) {
    throw new Error("نص العقد قصير جداً للتحليل.");
  }
  const articleIds = await pickRelevantArticles(contractText);
  if (articleIds.length === 0) {
    throw new Error(
      "تعذّر العثور على مواد قانونية مرجعية. تأكّد من تشغيل سكربت تحميل نظام العمل (seedLaw).",
    );
  }
  return performAnalysis(contractText, articleIds);
}
