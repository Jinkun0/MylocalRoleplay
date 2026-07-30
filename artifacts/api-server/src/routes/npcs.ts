import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  npcsTable,
  locationsTable,
  memoryTable,
  relationshipsTable,
} from "@workspace/db";
import {
  GetNpcParams,
  GetNpcMemoryParams,
  GetNpcRelationshipsParams,
  ListNpcsResponse,
  GetNpcResponse,
  GetNpcMemoryResponse,
  GetNpcRelationshipsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /npcs
router.get("/npcs", async (_req, res): Promise<void> => {
  const npcs = await db.select().from(npcsTable);
  const locations = await db.select().from(locationsTable);
  const locMap = new Map(locations.map((l) => [l.id, l.name]));
  const relationships = await db.select().from(relationshipsTable);
  const relMap = new Map(relationships.map((r) => [r.npcId, r.status]));

  const result = npcs.map((n) => ({
    id: n.id,
    name: n.name,
    locationId: n.locationId,
    locationName: locMap.get(n.locationId) ?? "Unknown",
    currentActivity: n.currentRoutine,
    emotionalState: n.emotionalState,
    relationshipWithPlayer: relMap.get(n.id) ?? null,
  }));
  res.json(ListNpcsResponse.parse(result));
});

// GET /npcs/:npcId
router.get("/npcs/:npcId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.npcId) ? req.params.npcId[0] : req.params.npcId;
  const params = GetNpcParams.safeParse({ npcId: Number(raw) });
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

  const [location] = await db
    .select()
    .from(locationsTable)
    .where(eq(locationsTable.id, npc.locationId));

  res.json(
    GetNpcResponse.parse({
      ...npc,
      locationName: location?.name ?? "Unknown",
    })
  );
});

// GET /npcs/:npcId/memory
router.get("/npcs/:npcId/memory", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.npcId) ? req.params.npcId[0] : req.params.npcId;
  const params = GetNpcMemoryParams.safeParse({ npcId: Number(raw) });
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

  const memories = await db
    .select()
    .from(memoryTable)
    .where(eq(memoryTable.ownerId, params.data.npcId));

  res.json(GetNpcMemoryResponse.parse(memories));
});

// GET /npcs/:npcId/relationships
router.get("/npcs/:npcId/relationships", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.npcId) ? req.params.npcId[0] : req.params.npcId;
  const params = GetNpcRelationshipsParams.safeParse({ npcId: Number(raw) });
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

  // Return the player's relationship with this NPC
  const [rel] = await db
    .select()
    .from(relationshipsTable)
    .where(eq(relationshipsTable.npcId, params.data.npcId));

  if (!rel) {
    res.json(GetNpcRelationshipsResponse.parse([]));
    return;
  }

  res.json(
    GetNpcRelationshipsResponse.parse([
      {
        id: rel.id,
        npcId: rel.npcId,
        npcName: npc.name,
        trust: rel.trust,
        respect: rel.respect,
        suspicion: rel.suspicion,
        friendship: rel.friendship,
        rivalry: rel.rivalry,
        status: rel.status,
        lastInteractionDay: rel.lastInteractionDay ?? null,
        notes: rel.notes ?? null,
      },
    ])
  );
});

export default router;
