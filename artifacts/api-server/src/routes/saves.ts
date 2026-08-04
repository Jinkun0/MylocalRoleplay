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
import { createSnapshot, loadSnapshot, VersionMismatchError } from "@workspace/world-core";
import type { SaveSnapshot } from "@workspace/world-core";
import { dbRowToWorldState, worldStateToDbUpdate } from "../lib/worldStateMapper";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/** Type-guard: returns true when the blob looks like a structured SaveSnapshot */
function isSaveSnapshot(blob: unknown): blob is SaveSnapshot {
  return (
    typeof blob === "object" &&
    blob !== null &&
    "snapshotMeta" in blob &&
    "worldState" in blob
  );
}

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

  // Build a canonical SaveSnapshot via world-core when a DB row is available;
  // fall back to an empty object only when the world has never been initialised.
  const snapshot: SaveSnapshot | Record<string, never> = state
    ? createSnapshot(dbRowToWorldState(state), { source: "manual" })
    : {};

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

  const snapshotBlob = save.snapshot as Record<string, unknown>;
  const [existing] = await db.select().from(worldStateTable).limit(1);

  let restoredLocationId: number;
  let restoredWorldDay: number;
  let restoredWorldTime: string;

  if (isSaveSnapshot(snapshotBlob)) {
    // Modern path: deserialise via world-core, then map back to DB fields.
    // A VersionMismatchError means the snapshot is modern but incompatible —
    // fail explicitly rather than falling back to legacy behaviour.
    let worldState;
    try {
      worldState = loadSnapshot(snapshotBlob);
    } catch (err) {
      if (err instanceof VersionMismatchError) {
        res.status(409).json({ error: err.message });
        return;
      }
      throw err;
    }
    const dbFields = worldStateToDbUpdate(worldState);
    restoredWorldDay = dbFields.worldDay ?? save.worldDay;
    restoredWorldTime = dbFields.worldTime ?? save.worldTime;
    restoredLocationId =
      (dbFields.currentLocationId as number | undefined) ??
      existing?.currentLocationId ??
      1;
  } else {
    // Legacy path: snapshot was stored as a raw DB row (pre-integration saves)
    logger.warn({ saveId: save.id }, "Loading legacy snapshot without snapshotMeta — using raw fields");
    restoredWorldDay = save.worldDay;
    restoredWorldTime = save.worldTime;
    restoredLocationId = (snapshotBlob.currentLocationId as number | undefined) ?? existing?.currentLocationId ?? 1;
  }

  const [loc] = await db
    .select()
    .from(locationsTable)
    .where(eq(locationsTable.id, restoredLocationId));

  let restored;
  if (existing) {
    [restored] = await db
      .update(worldStateTable)
      .set({
        worldDay: restoredWorldDay,
        worldTime: restoredWorldTime,
        currentLocationId: restoredLocationId,
        updatedAt: new Date(),
      })
      .where(eq(worldStateTable.id, existing.id))
      .returning();
  } else {
    [restored] = await db
      .insert(worldStateTable)
      .values({
        worldDay: restoredWorldDay,
        worldTime: restoredWorldTime,
        currentLocationId: restoredLocationId,
      })
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
