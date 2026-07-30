import type {
  worldStateTable,
  npcsTable,
  narrativeTable,
  locationsTable,
  memoryTable,
  eventsTable,
  relationshipsTable,
} from "@workspace/db";
import { generateNarratorResponse, type NarratorContext } from "./llm-narrator";

type WorldState = typeof worldStateTable.$inferSelect;
type Npc = typeof npcsTable.$inferSelect;
type NarrativeMsg = typeof narrativeTable.$inferSelect;
type Location = typeof locationsTable.$inferSelect;
type Relationship = typeof relationshipsTable.$inferSelect;
type Memory = typeof memoryTable.$inferSelect;
type InsertMemory = Omit<typeof memoryTable.$inferSelect, "id" | "createdAt">;
type InsertEvent = Omit<typeof eventsTable.$inferSelect, "id" | "createdAt">;

export interface NarrativeContext {
  playerText: string;
  state: WorldState;
  currentLocation: Location | null;
  accessibleLocations: Location[];
  presentNpcs: Npc[];
  targetNpc: Npc | null;
  targetRelationship: Relationship | null;
  targetNpcMemories: Memory[];
  recentHistory: NarrativeMsg[];
}

export interface NarrativeResult {
  narrative: string;
  moveToLocationId: number | null;
  newEvents: InsertEvent[];
  npcReactions: Array<{
    npcId: number;
    npcName: string;
    action: string;
    locationId: number;
    narrative: string | null;
  }>;
  newMemories: InsertMemory[];
  relationshipDelta: { trust: number; respect: number; suspicion: number; friendship: number };
}

function clampDelta(value: number | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.max(-5, Math.min(5, Math.round(value)));
}

export async function generateNarrativeResponse(ctx: NarrativeContext): Promise<NarrativeResult> {
  const { playerText, state, currentLocation, presentNpcs, targetNpc, targetRelationship, targetNpcMemories } = ctx;

  const narratorCtx: NarratorContext = {
    playerText,
    world: {
      day: state.worldDay,
      time: state.worldTime,
      weather: state.weather,
      locationName: currentLocation?.name ?? "un luogo indefinito",
      locationDescription: currentLocation?.description ?? "",
    },
    presentNpcs: presentNpcs.map((n) => ({
      id: n.id,
      name: n.name,
      activity: n.currentRoutine,
      emotionalState: n.emotionalState,
    })),
    targetNpc: targetNpc
      ? {
          id: targetNpc.id,
          name: targetNpc.name,
          age: targetNpc.age,
          personality: targetNpc.personality,
          background: targetNpc.background,
          objectives: targetNpc.objectives,
          currentRoutine: targetNpc.currentRoutine,
          emotionalState: targetNpc.emotionalState,
          knownSecrets: targetNpc.knownSecrets,
          relationship: {
            trust: targetRelationship?.trust ?? 0,
            respect: targetRelationship?.respect ?? 0,
            suspicion: targetRelationship?.suspicion ?? 0,
            friendship: targetRelationship?.friendship ?? 0,
            rivalry: targetRelationship?.rivalry ?? 0,
            status: targetRelationship?.status ?? "stranger",
          },
          memoriesAboutPlayer: targetNpcMemories.map((m) => m.content),
        }
      : null,
    accessibleLocations: ctx.accessibleLocations.map((l) => ({
      id: l.id,
      name: l.name,
      description: l.description,
    })),
    recentHistory: ctx.recentHistory.map((h) => ({ role: h.role, text: h.text })),
  };

  const result = await generateNarratorResponse(narratorCtx);

  const newEvents: InsertEvent[] = [];
  const newMemories: InsertMemory[] = [];
  const npcReactions: NarrativeResult["npcReactions"] = [];

  const validMoveId = result.moveToLocationId != null
    && ctx.accessibleLocations.some((l) => l.id === result.moveToLocationId)
    ? result.moveToLocationId
    : null;

  if (result.memory) {
    // Player-side record of the moment.
    newMemories.push({
      ownerId: 0,
      ownerType: "player",
      subjectId: targetNpc?.id ?? null,
      subjectName: targetNpc?.name ?? null,
      content: result.memory.content,
      importance: result.memory.importance,
      worldDay: state.worldDay,
      worldTime: state.worldTime,
      isLongTerm: result.memory.isLongTerm,
    });

    // Mirror into the target NPC's own memory — NPCs only know what they personally witnessed.
    if (targetNpc) {
      newMemories.push({
        ownerId: targetNpc.id,
        ownerType: "npc",
        subjectId: 0,
        subjectName: "Il giocatore",
        content: result.memory.content,
        importance: result.memory.importance,
        worldDay: state.worldDay,
        worldTime: state.worldTime,
        isLongTerm: result.memory.isLongTerm,
      });
    }
  }

  if (result.worldEvent) {
    newEvents.push({
      type: result.worldEvent.type,
      title: result.worldEvent.title,
      description: result.worldEvent.description,
      isActive: result.worldEvent.type === "plot",
      worldDay: state.worldDay,
      worldTime: state.worldTime,
      locationId: validMoveId ?? state.currentLocationId,
      involvedNpcIds: targetNpc ? [targetNpc.id] : [],
    });
  }

  if (targetNpc && result.npcReactionLabel) {
    npcReactions.push({
      npcId: targetNpc.id,
      npcName: targetNpc.name,
      action: result.npcReactionLabel,
      locationId: targetNpc.locationId,
      narrative: null,
    });
  }

  const relationshipDelta = result.relationshipDelta
    ? {
        trust: clampDelta(result.relationshipDelta.trust),
        respect: clampDelta(result.relationshipDelta.respect),
        suspicion: clampDelta(result.relationshipDelta.suspicion),
        friendship: clampDelta(result.relationshipDelta.friendship),
      }
    : { trust: 0, respect: 0, suspicion: 0, friendship: 0 };

  return {
    narrative: result.narrative,
    moveToLocationId: validMoveId,
    newEvents,
    npcReactions,
    newMemories,
    relationshipDelta,
  };
}
