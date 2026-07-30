import { Router, type IRouter } from "express";
import { eq, desc, count } from "drizzle-orm";
import { db, eventsTable, locationsTable } from "@workspace/db";
import {
  ListEventsQueryParams,
  ListEventsResponse,
  ListActiveEventsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /events
router.get("/events", async (req, res): Promise<void> => {
  const queryParsed = ListEventsQueryParams.safeParse(req.query);
  const limit = queryParsed.success ? (queryParsed.data.limit ?? 20) : 20;
  const offset = queryParsed.success ? (queryParsed.data.offset ?? 0) : 0;

  const allEvents = await db
    .select()
    .from(eventsTable)
    .orderBy(desc(eventsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(eventsTable);

  const locations = await db.select().from(locationsTable);
  const locMap = new Map(locations.map((l) => [l.id, l.name]));

  const events = allEvents.map((e) => ({
    ...e,
    locationName: locMap.get(e.locationId) ?? "Unknown",
  }));

  res.json(ListEventsResponse.parse({ events, total: Number(total), offset, limit }));
});

// GET /events/active
router.get("/events/active", async (_req, res): Promise<void> => {
  const activeEvents = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.isActive, true))
    .orderBy(desc(eventsTable.createdAt));

  const locations = await db.select().from(locationsTable);
  const locMap = new Map(locations.map((l) => [l.id, l.name]));

  const events = activeEvents.map((e) => ({
    ...e,
    locationName: locMap.get(e.locationId) ?? "Unknown",
  }));
  res.json(ListActiveEventsResponse.parse(events));
});

export default router;
