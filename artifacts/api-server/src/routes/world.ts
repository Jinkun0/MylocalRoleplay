import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  worldStateTable,
  locationsTable,
  npcsTable,
  eventsTable,
  memoryTable,
  relationshipsTable,
} from "@workspace/db";
import {
  GetWorldStateResponse,
  TickWorldBody,
  TickWorldResponse,
  GetWorldSummaryResponse,
  ListLocationsResponse,
  GetLocationParams,
  GetLocationResponse,
} from "@workspace/api-zod";
import { generateNpcTick, advanceWorldTime } from "../lib/world-engine";

const router: IRouter = Router();

// GET /world/state
router.get("/world/state", async (req, res): Promise<void> => {
  let [state] = await db.select().from(worldStateTable).limit(1);
  if (!state) {
    // Bootstrap world state on first access
    const [loc] = await db.select().from(locationsTable).limit(1);
    const locationId = loc?.id ?? 1;
    const locationName = loc?.name ?? "Unknown";
    [state] = await db
      .insert(worldStateTable)
      .values({ currentLocationId: locationId })
      .returning();
  }
  const [loc] = await db
    .select()
    .from(locationsTable)
    .where(eq(locationsTable.id, state.currentLocationId));
  res.json(
    GetWorldStateResponse.parse({
      ...state,
      currentLocationName: loc?.name ?? "Unknown",
    })
  );
});

// POST /world/tick
router.post("/world/tick", async (req, res): Promise<void> => {
  const parsed = TickWorldBody.safeParse(req.body ?? {});
  const minutesToAdvance = parsed.success
    ? (parsed.data.minutesToAdvance ?? 60)
    : 60;

  let [state] = await db.select().from(worldStateTable).limit(1);
  if (!state) {
    const [loc] = await db.select().from(locationsTable).limit(1);
    [state] = await db
      .insert(worldStateTable)
      .values({ currentLocationId: loc?.id ?? 1 })
      .returning();
  }

  const updated = advanceWorldTime(state.worldDay, state.worldTime, minutesToAdvance);
  const [newState] = await db
    .update(worldStateTable)
    .set({ worldDay: updated.day, worldTime: updated.time, updatedAt: new Date() })
    .where(eq(worldStateTable.id, state.id))
    .returning();

  const allNpcs = await db.select().from(npcsTable);
  const npcActions = await generateNpcTick(allNpcs, newState, db);

  const triggeredEvents: typeof eventsTable.$inferSelect[] = [];
  for (const action of npcActions) {
    if (action.narrative) {
      const [evt] = await db
        .insert(eventsTable)
        .values({
          type: "npc_action",
          title: `${action.npcName}: ${action.action}`,
          description: action.narrative,
          worldDay: newState.worldDay,
          worldTime: newState.worldTime,
          locationId: action.locationId,
          involvedNpcIds: [action.npcId],
        })
        .returning();
      triggeredEvents.push(evt);
    }
  }

  const [loc] = await db
    .select()
    .from(locationsTable)
    .where(eq(locationsTable.id, newState.currentLocationId));

  const summary =
    npcActions.length > 0
      ? npcActions
          .filter((a) => a.narrative)
          .slice(0, 3)
          .map((a) => a.narrative)
          .join(" ")
      : "Il tempo scorre tranquillo. Il mondo respira.";

  res.json(
    TickWorldResponse.parse({
      worldState: { ...newState, currentLocationName: loc?.name ?? "Unknown" },
      triggeredEvents,
      npcActions,
      narrativeSummary: summary,
    })
  );
});

// GET /world/summary
router.get("/world/summary", async (req, res): Promise<void> => {
  let [state] = await db.select().from(worldStateTable).limit(1);
  if (!state) {
    const [loc] = await db.select().from(locationsTable).limit(1);
    [state] = await db
      .insert(worldStateTable)
      .values({ currentLocationId: loc?.id ?? 1 })
      .returning();
  }

  const [loc] = await db
    .select()
    .from(locationsTable)
    .where(eq(locationsTable.id, state.currentLocationId));

  const presentNpcs = await db
    .select()
    .from(npcsTable)
    .where(eq(npcsTable.locationId, state.currentLocationId));

  const relationships = await db.select().from(relationshipsTable);
  const relMap = new Map(relationships.map((r) => [r.npcId, r.status]));

  const activeEvents = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.isActive, true));

  const recentMemories = await db
    .select()
    .from(memoryTable)
    .orderBy(memoryTable.createdAt)
    .limit(5);

  const relationshipCount = relationships.length;

  const npcsWithRelations = presentNpcs.map((n) => ({
    id: n.id,
    name: n.name,
    locationId: n.locationId,
    locationName: loc?.name ?? "Unknown",
    currentActivity: n.currentRoutine,
    emotionalState: n.emotionalState,
    relationshipWithPlayer: relMap.get(n.id) ?? null,
  }));

  const eventsWithLocation = await Promise.all(
    activeEvents.map(async (e) => {
      const [l] = await db
        .select()
        .from(locationsTable)
        .where(eq(locationsTable.id, e.locationId));
      return { ...e, locationName: l?.name ?? "Unknown" };
    })
  );

  res.json(
    GetWorldSummaryResponse.parse({
      worldState: { ...state, currentLocationName: loc?.name ?? "Unknown" },
      presentNpcs: npcsWithRelations,
      activeEvents: eventsWithLocation,
      recentMemories,
      relationshipCount,
    })
  );
});

// GET /world/locations
router.get("/world/locations", async (_req, res): Promise<void> => {
  const locations = await db.select().from(locationsTable);
  const npcs = await db.select().from(npcsTable);
  const npcCountByLocation = new Map<number, number>();
  for (const n of npcs) {
    npcCountByLocation.set(n.locationId, (npcCountByLocation.get(n.locationId) ?? 0) + 1);
  }
  const result = locations.map((l) => ({
    ...l,
    npcCount: npcCountByLocation.get(l.id) ?? 0,
  }));
  res.json(ListLocationsResponse.parse(result));
});

// GET /world/locations/:locationId
router.get("/world/locations/:locationId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.locationId)
    ? req.params.locationId[0]
    : req.params.locationId;
  const params = GetLocationParams.safeParse({ locationId: Number(raw) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid location id" });
    return;
  }

  const [location] = await db
    .select()
    .from(locationsTable)
    .where(eq(locationsTable.id, params.data.locationId));
  if (!location) {
    res.status(404).json({ error: "Location not found" });
    return;
  }

  const presentNpcs = await db
    .select()
    .from(npcsTable)
    .where(eq(npcsTable.locationId, location.id));

  const relationships = await db.select().from(relationshipsTable);
  const relMap = new Map(relationships.map((r) => [r.npcId, r.status]));

  const recentEvents = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.locationId, location.id));

  res.json(
    GetLocationResponse.parse({
      ...location,
      presentNpcs: presentNpcs.map((n) => ({
        id: n.id,
        name: n.name,
        locationId: n.locationId,
        locationName: location.name,
        currentActivity: n.currentRoutine,
        emotionalState: n.emotionalState,
        relationshipWithPlayer: relMap.get(n.id) ?? null,
      })),
      recentEvents: recentEvents.map((e) => ({ ...e, locationName: location.name })),
    })
  );
});

export default router;
