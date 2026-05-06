import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { db, contractsTable, contractAnalysesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { CreateContractBody, GetContractParams } from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../lib/auth";
import { extractTextFromFile } from "../lib/pdf";
import { analyzeContract } from "../lib/analyze";

const router: IRouter = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.get("/", async (req: Request, res: Response) => {
  const { userId } = (req as AuthedRequest).user;
  const rows = await db
    .select({
      id: contractsTable.id,
      title: contractsTable.title,
      fileName: contractsTable.fileName,
      createdAt: contractsTable.createdAt,
    })
    .from(contractsTable)
    .where(eq(contractsTable.userId, userId))
    .orderBy(desc(contractsTable.createdAt));

  // Attach latest analysis status per contract
  const results = await Promise.all(
    rows.map(async (c) => {
      const [latest] = await db
        .select({ status: contractAnalysesTable.status })
        .from(contractAnalysesTable)
        .where(eq(contractAnalysesTable.contractId, c.id))
        .orderBy(desc(contractAnalysesTable.createdAt))
        .limit(1);
      return { ...c, analysisStatus: latest?.status ?? null };
    }),
  );
  res.json(results);
});

router.post("/", async (req: Request, res: Response) => {
  const parsed = CreateContractBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" });
    return;
  }
  const { userId } = (req as AuthedRequest).user;
  const [created] = await db
    .insert(contractsTable)
    .values({
      userId,
      title: parsed.data.title.trim().slice(0, 500),
      content: parsed.data.content,
    })
    .returning();
  res.status(201).json({
    id: created.id,
    title: created.title,
    content: created.content,
    fileName: created.fileName,
    fileSize: created.fileSize,
    createdAt: created.createdAt,
  });
});

router.post(
  "/upload",
  upload.single("file"),
  async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "لم يتم رفع أي ملف" });
      return;
    }
    let text: string;
    try {
      text = await extractTextFromFile(file.buffer, file.mimetype, file.originalname);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "فشل قراءة الملف";
      res.status(400).json({ error: msg });
      return;
    }
    if (!text || text.trim().length < 20) {
      res.status(400).json({
        error:
          "تعذّر استخراج نص كافٍ من الملف. تأكّد أن الملف يحتوي على نص قابل للقراءة وليس صورة ممسوحة ضوئياً (PDF مصوَّر).",
      });
      return;
    }
    const { userId } = (req as AuthedRequest).user;
    const title =
      (typeof req.body?.title === "string" && req.body.title.trim()) ||
      file.originalname.replace(/\.[^.]+$/, "").slice(0, 500);
    const [created] = await db
      .insert(contractsTable)
      .values({
        userId,
        title,
        content: text,
        fileName: file.originalname,
        fileSize: file.size,
      })
      .returning();
    res.status(201).json({
      id: created.id,
      title: created.title,
      content: created.content,
      fileName: created.fileName,
      fileSize: created.fileSize,
      createdAt: created.createdAt,
    });
  },
);

router.get("/:id", async (req: Request, res: Response) => {
  const params = GetContractParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "معرّف غير صالح" });
    return;
  }
  const { userId } = (req as AuthedRequest).user;
  const [contract] = await db
    .select()
    .from(contractsTable)
    .where(
      and(eq(contractsTable.id, params.data.id), eq(contractsTable.userId, userId)),
    )
    .limit(1);
  if (!contract) {
    res.status(404).json({ error: "العقد غير موجود" });
    return;
  }
  const [analysis] = await db
    .select()
    .from(contractAnalysesTable)
    .where(eq(contractAnalysesTable.contractId, contract.id))
    .orderBy(desc(contractAnalysesTable.createdAt))
    .limit(1);

  res.json({
    contract: {
      id: contract.id,
      title: contract.title,
      content: contract.content,
      fileName: contract.fileName,
      fileSize: contract.fileSize,
      createdAt: contract.createdAt,
    },
    analysis: analysis ?? null,
  });
});

router.delete("/:id", async (req: Request, res: Response) => {
  const params = GetContractParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "معرّف غير صالح" });
    return;
  }
  const { userId } = (req as AuthedRequest).user;
  const result = await db
    .delete(contractsTable)
    .where(
      and(eq(contractsTable.id, params.data.id), eq(contractsTable.userId, userId)),
    )
    .returning({ id: contractsTable.id });
  if (result.length === 0) {
    res.status(404).json({ error: "العقد غير موجود" });
    return;
  }
  res.status(204).end();
});

router.post("/:id/analyze", async (req: Request, res: Response) => {
  const params = GetContractParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "معرّف غير صالح" });
    return;
  }
  const { userId } = (req as AuthedRequest).user;
  const [contract] = await db
    .select()
    .from(contractsTable)
    .where(
      and(eq(contractsTable.id, params.data.id), eq(contractsTable.userId, userId)),
    )
    .limit(1);
  if (!contract) {
    res.status(404).json({ error: "العقد غير موجود" });
    return;
  }

  // Create a pending analysis row
  const [pending] = await db
    .insert(contractAnalysesTable)
    .values({ contractId: contract.id, status: "running" })
    .returning();

  try {
    const result = await analyzeContract(contract.content);
    const [updated] = await db
      .update(contractAnalysesTable)
      .set({
        status: "completed",
        summary: result.summary,
        contractType: result.contractType,
        partiesDescription: result.partiesDescription,
        employeeRights: result.employeeRights,
        employerRights: result.employerRights,
        alerts: result.alerts,
        citations: result.citations,
        completedAt: new Date(),
      })
      .where(eq(contractAnalysesTable.id, pending.id))
      .returning();
    res.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "فشل التحليل";
    req.log.error({ err }, "Analysis failed");
    const [failed] = await db
      .update(contractAnalysesTable)
      .set({
        status: "failed",
        errorMessage: msg,
        completedAt: new Date(),
      })
      .where(eq(contractAnalysesTable.id, pending.id))
      .returning();
    res.status(500).json(failed);
  }
});

export default router;
