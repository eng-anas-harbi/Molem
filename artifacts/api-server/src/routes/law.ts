import { Router, type IRouter, type Request, type Response } from "express";
import { searchArticles } from "../lib/lawIndex";

const router: IRouter = Router();

router.get("/articles", async (req: Request, res: Response) => {
  const q = typeof req.query.q === "string" ? req.query.q : undefined;
  const source = typeof req.query.source === "string" ? req.query.source : undefined;
  const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : 20;
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 20;
  const sourceFiltered =
    source === "law" || source === "regulation" ? source : undefined;
  const articles = await searchArticles(q, sourceFiltered, limit);
  res.json(articles);
});

export default router;
