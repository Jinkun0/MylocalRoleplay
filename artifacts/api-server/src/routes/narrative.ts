import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import {
  db,
  narrativeTable,
  worldStateTable,
  npcsTable,
  eventsTable,
  memoryTable,
  locationsTable,
  relationshipsTable,
} from "@workspace/db";
import {
  PerformActionBody,
  PerformActionResponse,
  GetNarrativeHistoryQueryParams,
  GetNarrativeHistoryResponse,
} from "@workspace/api-zod";
import { generateNarrativeResponse } from "../lib/narrative-engine";

const router: IRouter = Router();

// POST /narrative/action
router.post("/narrative/action", async (req, res): Promise<void> => {
  const parsed = PerformActionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { text, targetNpcId } = parsed.data;

  let [state] = await db.select().from(worldStateTable).limit(1);
  if (!state) {
    const [loc] = await db.select().from(locationsTable).limit(1);
    [state] = await db
      .insert(worldStateTable)
      .values({ currentLocationId: loc?.id ?? 1 })
      .returning();
  }

  // Save player message
  const [playerMsg] = await db
    .insert(narrativeTable)
    .values({
      role: "player",
      text,
      worldDay: state.worldDay,
      worldTime: state.worldTime,
    })
    .returning();

  // Get context for narrative generation
  const [currentLocation] = await db
    .select()
    .from(locationsTable)
    .where(eq(locationsTable.id, state.currentLocationId));

  const presentNpcs = await db
    .select()
    .from(npcsTable)
    .where(eq(npcsTable.locationId, state.currentLocationId));

  let targetNpc = null;
  if (targetNpcId) {
    const [n] = await db
      .select()
      .from(npcsTable)
      .where(eq(npcsTable.id, targetNpcId));
    targetNpc = n ?? null;
  }

  const recentHistory = await db
    .select()
    .from(narrativeTable)
    .orderBy(desc(narrativeTable.createdAt))
    .limit(10);

  // Generate narrative response
  const narrativeResult = generateNarrativeResponse({
    playerText: text,
    state,
    currentLocation: currentLocation ?? null,
    presentNpcs,
    targetNpc,
    recentHistory: recentHistory.reverse(),
  });

  // Save narrator response
  const [narratorMsg] = await db
    .insert(narrativeTable)
    .values({
      role: "narrator",
      text: narrativeResult.narrative,
      worldDay: state.worldDay,
      worldTime: state.worldTime,
    })
    .returning();

  // Record new memories from this interaction
  const newMemories: typeof memoryTable.$inferSelect[] = [];
  for (const mem of narrativeResult.newMemories) {
    const [m] = await db.insert(memoryTable).values(mem).returning();
    newMemories.push(m);
  }

  // Record new events
  const newEvents: typeof eventsTable.$inferSelect[] = [];
  for (const evt of narrativeResult.newEvents) {
    const [e] = await db.insert(eventsTable).values(evt).returning();
    newEvents.push(e);
  }

  // Update relationships if interaction happened with an NPC
  const npcReactions = narrativeResult.npcReactions;
  if (targetNpc) {
    const [existing] = await db
      .select()
      .from(relationshipsTable)
      .where(eq(relationshipsTable.npcId, targetNpc.id));

    if (existing) {
      const delta = narrativeResult.relationshipDelta;
      await db
        .update(relationshipsTable)
        .set({
          trust: Math.max(-100, Math.min(100, existing.trust + delta.trust)),
          friendship: Math.max(-100, Math.min(100, existing.friendship + delta.friendship)),
          lastInteractionDay: state.worldDay,
          updatedAt: new Date(),
        })
        .where(eq(relationshipsTable.npcId, targetNpc.id));
    } else {
      await db.insert(relationshipsTable).values({
        npcId: targetNpc.id,
        trust: narrativeResult.relationshipDelta.trust,
        respect: 0,
        suspicion: 0,
        friendship: narrativeResult.relationshipDelta.friendship,
        rivalry: 0,
        status: "acquaintance",
        lastInteractionDay: state.worldDay,
      });
    }
  }

  const eventsWithLocation = await Promise.all(
    newEvents.map(async (e) => {
      const [l] = await db
        .select()
        .from(locationsTable)
        .where(eq(locationsTable.id, e.locationId));
      return { ...e, locationName: l?.name ?? "Unknown" };
    })
  );

  res.json(
    PerformActionResponse.parse({
      narrative: narrativeResult.narrative,
      worldStateChanged: false,
      newEvents: eventsWithLocation,
      npcReactions: npcReactions.map((a) => ({
        ...a,
        locationName: currentLocation?.name ?? "Unknown",
      })),
      newMemories,
      messageId: narratorMsg.id,
      worldDay: state.worldDay,
      worldTime: state.worldTime,
    })
  );
});

// GET /narrative/history
router.get("/narrative/history", async (req, res): Promise<void> => {
  const queryParsed = GetNarrativeHistoryQueryParams.safeParse(req.query);
  const limit = queryParsed.success ? (queryParsed.data.limit ?? 50) : 50;

  const messages = await db
    .select()
    .from(narrativeTable)
    .orderBy(desc(narrativeTable.createdAt))
    .limit(limit);

  res.json(GetNarrativeHistoryResponse.parse(messages.reverse()));
});

export default router;
