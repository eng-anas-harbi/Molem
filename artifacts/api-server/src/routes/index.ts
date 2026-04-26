import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import contractsRouter from "./contracts";
import lawRouter from "./law";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/contracts", contractsRouter);
router.use("/law", lawRouter);

export default router;
