import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  savesTable,
  worldStateTable,
  locationsTable,
} from "@workspace/db";
import {
  CreateSaveBody,
  DeleteSaveParams,
  LoadSaveParams,
  ListSavesResponse,
  CreateSaveResponse,
  LoadSaveResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /saves
router.get("/saves", async (_req, res): Promise<void> => {
  const saves = await db
    .select()
    .from(savesTable)
    .orderBy(savesTable.createdAt);
  res.json(ListSavesResponse.parse(saves));
});

// POST /saves
router.post("/saves", async (req, res): Promise<void> => {
  const parsed = CreateSaveBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [state] = await db.select().from(worldStateTable).limit(1);
  const [loc] = state
    ? await db
        .select()
        .from(locationsTable)
        .where(eq(locationsTable.id, state.currentLocationId))
    : [];

  const snapshot = state ?? {};

  const [save] = await db
    .insert(savesTable)
    .values({
      name: parsed.data.name,
      worldDay: state?.worldDay ?? 1,
      worldTime: state?.worldTime ?? "08:00",
      locationName: loc?.name ?? "Unknown",
      snapshot,
    })
    .returning();

  res.status(201).json(CreateSaveResponse.parse(save));
});

// DELETE /saves/:saveId
router.delete("/saves/:saveId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.saveId)
    ? req.params.saveId[0]
    : req.params.saveId;
  const params = DeleteSaveParams.safeParse({ saveId: Number(raw) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid save id" });
    return;
  }

  const [deleted] = await db
    .delete(savesTable)
    .where(eq(savesTable.id, params.data.saveId))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Save not found" });
    return;
  }

  res.sendStatus(204);
});

// POST /saves/:saveId/load
router.post("/saves/:saveId/load", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.saveId)
    ? req.params.saveId[0]
    : req.params.saveId;
  const params = LoadSaveParams.safeParse({ saveId: Number(raw) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid save id" });
    return;
  }

  const [save] = await db
    .select()
    .from(savesTable)
    .where(eq(savesTable.id, params.data.saveId));
  if (!save) {
    res.status(404).json({ error: "Save not found" });
    return;
  }

  const snapshot = save.snapshot as Record<string, unknown>;
  const [loc] = await db
    .select()
    .from(locationsTable)
    .where(eq(locationsTable.id, (snapshot.currentLocationId as number) ?? 1));

  // Restore world state from snapshot
  const [existing] = await db.select().from(worldStateTable).limit(1);
  let restored;
  if (existing) {
    [restored] = await db
      .update(worldStateTable)
      .set({
        worldDay: save.worldDay,
        worldTime: save.worldTime,
        currentLocationId: (snapshot.currentLocationId as number) ?? existing.currentLocationId,
        updatedAt: new Date(),
      })
      .where(eq(worldStateTable.id, existing.id))
      .returning();
  } else {
    [restored] = await db
      .insert(worldStateTable)
      .values({ worldDay: save.worldDay, worldTime: save.worldTime })
      .returning();
  }

  res.json(
    LoadSaveResponse.parse({
      ...restored,
      currentLocationName: loc?.name ?? save.locationName,
    })
  );
});

export default router;
