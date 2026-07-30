import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, relationshipsTable, npcsTable } from "@workspace/db";
import {
  GetRelationshipParams,
  ListRelationshipsResponse,
  GetRelationshipResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /relationships
router.get("/relationships", async (_req, res): Promise<void> => {
  const relationships = await db.select().from(relationshipsTable);
  const npcs = await db.select().from(npcsTable);
  const npcMap = new Map(npcs.map((n) => [n.id, n.name]));

  const result = relationships.map((r) => ({
    ...r,
    npcName: npcMap.get(r.npcId) ?? "Unknown",
    lastInteractionDay: r.lastInteractionDay ?? null,
    notes: r.notes ?? null,
  }));
  res.json(ListRelationshipsResponse.parse(result));
});

// GET /relationships/:npcId
router.get("/relationships/:npcId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.npcId)
    ? req.params.npcId[0]
    : req.params.npcId;
  const params = GetRelationshipParams.safeParse({ npcId: Number(raw) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid NPC id" });
    return;
  }

  const [npc] = await db
    .select()
    .from(npcsTable)
    .where(eq(npcsTable.id, params.data.npcId));
  if (!npc) {
    res.status(404).json({ error: "NPC not found" });
    return;
  }

  const [rel] = await db
    .select()
    .from(relationshipsTable)
    .where(eq(relationshipsTable.npcId, params.data.npcId));

  if (!rel) {
    // Return default relationship for NPCs not yet interacted with
    res.json(
      GetRelationshipResponse.parse({
        id: 0,
        npcId: npc.id,
        npcName: npc.name,
        trust: 0,
        respect: 0,
        suspicion: 0,
        friendship: 0,
        rivalry: 0,
        status: "stranger",
        lastInteractionDay: null,
        notes: null,
      })
    );
    return;
  }

  res.json(
    GetRelationshipResponse.parse({
      ...rel,
      npcName: npc.name,
      lastInteractionDay: rel.lastInteractionDay ?? null,
      notes: rel.notes ?? null,
    })
  );
});

export default router;
