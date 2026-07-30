import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, memoryTable } from "@workspace/db";
import { ListMemoriesQueryParams, ListMemoriesResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// GET /memory
router.get("/memory", async (req, res): Promise<void> => {
  const queryParsed = ListMemoriesQueryParams.safeParse(req.query);
  const limit = queryParsed.success ? (queryParsed.data.limit ?? 30) : 30;
  const subjectId = queryParsed.success ? queryParsed.data.subjectId : undefined;

  let query = db
    .select()
    .from(memoryTable)
    .orderBy(desc(memoryTable.createdAt))
    .limit(limit);

  const memories = await query;

  const filtered =
    subjectId != null
      ? memories.filter((m) => m.subjectId === subjectId)
      : memories;

  res.json(ListMemoriesResponse.parse(filtered));
});

export default router;
