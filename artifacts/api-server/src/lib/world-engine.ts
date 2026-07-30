import { eq } from "drizzle-orm";
import { npcsTable, locationsTable } from "@workspace/db";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

const WEATHER_CONDITIONS = [
  "sereno",
  "nuvoloso",
  "piovoso",
  "nebbioso",
  "ventoso",
  "tempestoso",
  "soleggiato",
  "gelido",
];

const NPC_ACTIVITIES: Record<string, string[]> = {
  morning: [
    "si prepara per la giornata",
    "fa colazione",
    "legge le notizie",
    "si veste lentamente",
    "guarda fuori dalla finestra",
  ],
  midday: [
    "lavora in silenzio",
    "pranza da solo",
    "cammina nel mercato",
    "discute con qualcuno",
    "osserva i passanti",
  ],
  afternoon: [
    "riordina i propri effetti",
    "scrive qualcosa",
    "riposa all'ombra",
    "parla sottovoce con qualcuno",
    "esamina un oggetto misterioso",
  ],
  evening: [
    "accende un fuoco",
    "legge un vecchio libro",
    "beve in silenzio",
    "fissa le stelle",
    "lucida le proprie armi",
  ],
  night: [
    "dorme",
    "veglia nel buio",
    "scrive al lume di candela",
    "cammina furtivamente",
    "medita in solitudine",
  ],
};

const EMOTIONAL_STATES = [
  "tranquillo",
  "inquieto",
  "sospettoso",
  "malinconico",
  "determinato",
  "timoroso",
  "curioso",
  "arrabbiato",
  "triste",
  "sereno",
];

export function advanceWorldTime(
  currentDay: number,
  currentTime: string,
  minutesToAdvance: number
): { day: number; time: string } {
  const [hours, minutes] = currentTime.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + minutesToAdvance;
  const newDay = currentDay + Math.floor(totalMinutes / (24 * 60));
  const remainingMinutes = totalMinutes % (24 * 60);
  const newHours = Math.floor(remainingMinutes / 60);
  const newMins = remainingMinutes % 60;
  return {
    day: newDay,
    time: `${String(newHours).padStart(2, "0")}:${String(newMins).padStart(2, "0")}`,
  };
}

export function getTimeOfDay(time: string): string {
  const [hours] = time.split(":").map(Number);
  if (hours >= 6 && hours < 12) return "morning";
  if (hours >= 12 && hours < 17) return "midday";
  if (hours >= 17 && hours < 21) return "afternoon";
  if (hours >= 21 || hours < 6) return "evening";
  return "night";
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function generateNpcTick(
  npcs: Array<typeof npcsTable.$inferSelect>,
  state: { worldDay: number; worldTime: string; currentLocationId: number },
  db: NodePgDatabase<Record<string, unknown>>
) {
  const timeOfDay = getTimeOfDay(state.worldTime);
  const activities = NPC_ACTIVITIES[timeOfDay] ?? NPC_ACTIVITIES["midday"];
  const actions: Array<{
    npcId: number;
    npcName: string;
    action: string;
    locationId: number;
    locationName: string;
    narrative: string | null;
  }> = [];

  const locations = await (db as any).select().from(locationsTable);
  const locMap = new Map(
    (locations as Array<typeof locationsTable.$inferSelect>).map((l) => [l.id, l.name])
  );

  for (const npc of npcs) {
    const newActivity = randomFrom(activities);
    const shouldChangeEmotion = Math.random() < 0.3;
    const newEmotion = shouldChangeEmotion
      ? randomFrom(EMOTIONAL_STATES)
      : npc.emotionalState;

    // Move NPC to a random location occasionally
    const shouldMove = Math.random() < 0.2;
    const locIds = (locations as Array<typeof locationsTable.$inferSelect>)
      .filter((l) => l.isAccessible)
      .map((l) => l.id);
    const newLocationId =
      shouldMove && locIds.length > 0 ? randomFrom(locIds) : npc.locationId;

    await (db as any)
      .update(npcsTable)
      .set({
        currentRoutine: newActivity,
        emotionalState: newEmotion,
        locationId: newLocationId,
        updatedAt: new Date(),
      })
      .where(eq(npcsTable.id, npc.id));

    const locationName = locMap.get(newLocationId) ?? "Unknown";
    const shouldGenerateNarrative = Math.random() < 0.35;

    actions.push({
      npcId: npc.id,
      npcName: npc.name,
      action: newActivity,
      locationId: newLocationId,
      locationName,
      narrative: shouldGenerateNarrative
        ? `${npc.name} ${newActivity} a ${locationName}.`
        : null,
    });
  }

  // Random weather change
  if (Math.random() < 0.15) {
    // Weather will be changed by the caller if desired
  }

  return actions;
}
