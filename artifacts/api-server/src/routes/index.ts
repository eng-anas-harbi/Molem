import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import contractsRouter from "./contracts";
import lawRouter from "./law";
import chatRouter from "./chat";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/contracts", contractsRouter);
router.use("/law", lawRouter);
router.use("/chat", chatRouter);

export default router;
