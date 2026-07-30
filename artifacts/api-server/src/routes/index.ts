import { Router, type IRouter } from "express";
import healthRouter from "./health";
import worldRouter from "./world";
import npcsRouter from "./npcs";
import eventsRouter from "./events";
import memoryRouter from "./memory";
import narrativeRouter from "./narrative";
import relationshipsRouter from "./relationships";
import savesRouter from "./saves";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(worldRouter);
router.use(npcsRouter);
router.use(eventsRouter);
router.use(memoryRouter);
router.use(narrativeRouter);
router.use(relationshipsRouter);
router.use(savesRouter);
router.use(settingsRouter);

export default router;
