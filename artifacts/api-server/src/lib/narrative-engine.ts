import type { worldStateTable, npcsTable, narrativeTable, locationsTable, memoryTable, eventsTable } from "@workspace/db";

type WorldState = typeof worldStateTable.$inferSelect;
type Npc = typeof npcsTable.$inferSelect;
type NarrativeMsg = typeof narrativeTable.$inferSelect;
type Location = typeof locationsTable.$inferSelect;
type InsertMemory = Omit<typeof memoryTable.$inferSelect, "id" | "createdAt">;
type InsertEvent = Omit<typeof eventsTable.$inferSelect, "id" | "createdAt">;

interface NarrativeContext {
  playerText: string;
  state: WorldState;
  currentLocation: Location | null;
  presentNpcs: Npc[];
  targetNpc: Npc | null;
  recentHistory: NarrativeMsg[];
}

interface NarrativeResult {
  narrative: string;
  newEvents: InsertEvent[];
  npcReactions: Array<{
    npcId: number;
    npcName: string;
    action: string;
    locationId: number;
    narrative: string | null;
  }>;
  newMemories: InsertMemory[];
  relationshipDelta: { trust: number; friendship: number };
}

const NARRATOR_TEMPLATES = {
  observe: [
    "Il mondo intorno a te si fa più nitido. {location} sembra respirare al ritmo del tempo che passa.",
    "Osservi con attenzione. {location} custodisce i suoi segreti in silenzio.",
    "La luce di {time} filtra attraverso l'aria ferma. {location} è proprio come la ricordavi.",
  ],
  move: [
    "Ti muovi verso {target}. I tuoi passi echeggiare sul selciato.",
    "Lasci {location} alle spalle e ti dirigi verso {target}. Il percorso è familiare.",
    "Cammini con decisione. {target} ti aspetta dall'altra parte.",
  ],
  speak: [
    "{npc} ti guarda con occhi penetranti. Per un momento, il silenzio si allunga tra voi. Poi parla.",
    "Le parole di {npc} sono misurate, quasi pesate. C'è qualcosa che trattiene.",
    "{npc} inclina leggermente la testa. La tua richiesta sembra averlo colto di sorpresa.",
  ],
  action: [
    "Agisci. Le conseguenze del tuo gesto si propagano come cerchi sull'acqua.",
    "Il momento si cristallizza. Poi il mondo riprende il suo corso.",
    "Qualcosa è cambiato, anche se non si vede ancora. Lo sentirai presto.",
  ],
  default: [
    "La realtà registra la tua presenza. Il mondo si aggiorna silenziosamente.",
    "Fai ciò che hai deciso. Il mondo intorno a te continua il suo ciclo immutabile.",
    "Il tuo nome riecheggia nei registri invisibili di questo luogo.",
  ],
};

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function detectIntent(text: string): "observe" | "move" | "speak" | "action" {
  const lower = text.toLowerCase();
  if (
    lower.includes("osserv") ||
    lower.includes("guard") ||
    lower.includes("esamin") ||
    lower.includes("ascolt")
  )
    return "observe";
  if (
    lower.includes("vai") ||
    lower.includes("va ") ||
    lower.includes("cammina") ||
    lower.includes("muov") ||
    lower.includes("dirigit") ||
    lower.includes("spost")
  )
    return "move";
  if (
    lower.includes("dici") ||
    lower.includes("parla") ||
    lower.includes("chiedi") ||
    lower.includes("rispond") ||
    lower.includes("sussurr") ||
    lower.includes("grida")
  )
    return "speak";
  return "action";
}

function buildNarrativeText(
  template: string,
  context: {
    location: string;
    time: string;
    npc: string;
    target: string;
  }
): string {
  return template
    .replace(/{location}/g, context.location)
    .replace(/{time}/g, context.time)
    .replace(/{npc}/g, context.npc)
    .replace(/{target}/g, context.target);
}

export function generateNarrativeResponse(ctx: NarrativeContext): NarrativeResult {
  const { playerText, state, currentLocation, presentNpcs, targetNpc } = ctx;
  const intent = detectIntent(playerText);
  const locationName = currentLocation?.name ?? "questo luogo";
  const targetNpcName = targetNpc?.name ?? (presentNpcs[0]?.name ?? "l'ombra");
  const templates = NARRATOR_TEMPLATES[intent];
  const template = randomFrom(templates);

  const narrative = buildNarrativeText(template, {
    location: locationName,
    time: state.worldTime,
    npc: targetNpcName,
    target: playerText.split(" ").slice(-2).join(" "),
  });

  const newEvents: InsertEvent[] = [];
  const newMemories: InsertMemory[] = [];
  const npcReactions: NarrativeResult["npcReactions"] = [];

  // Record this as a player memory
  newMemories.push({
    ownerId: 0,
    ownerType: "player",
    subjectId: targetNpc?.id ?? null,
    subjectName: targetNpc?.name ?? null,
    content: `Il giocatore ha agito: "${playerText.slice(0, 100)}"`,
    importance: intent === "action" ? "medium" : "low",
    worldDay: state.worldDay,
    worldTime: state.worldTime,
    isLongTerm: intent === "action",
  });

  // Record event if action
  if (intent === "action" || intent === "speak") {
    newEvents.push({
      type: "player_action",
      title: `Il giocatore: ${playerText.slice(0, 60)}`,
      description: narrative,
      isActive: false,
      worldDay: state.worldDay,
      worldTime: state.worldTime,
      locationId: state.currentLocationId,
      involvedNpcIds: targetNpc ? [targetNpc.id] : [],
    });
  }

  // NPC reaction if speaking to someone
  if (intent === "speak" && targetNpc) {
    const reactions = [
      `${targetNpc.name} ti osserva in silenzio per un lungo momento.`,
      `${targetNpc.name} annuisce lentamente, come se avesse atteso queste parole.`,
      `${targetNpc.name} distoglie lo sguardo prima di rispondere.`,
      `${targetNpc.name} scuote la testa, ma non sembra sorpreso.`,
    ];
    npcReactions.push({
      npcId: targetNpc.id,
      npcName: targetNpc.name,
      action: randomFrom(reactions),
      locationId: state.currentLocationId,
      narrative: randomFrom(reactions),
    });

    // NPC records interaction in memory
    newMemories.push({
      ownerId: targetNpc.id,
      ownerType: "npc",
      subjectId: 0,
      subjectName: "Il giocatore",
      content: `Il giocatore si è rivolto a me: "${playerText.slice(0, 100)}"`,
      importance: "medium",
      worldDay: state.worldDay,
      worldTime: state.worldTime,
      isLongTerm: true,
    });
  }

  const relationshipDelta =
    intent === "speak"
      ? { trust: Math.floor(Math.random() * 6) - 2, friendship: Math.floor(Math.random() * 4) - 1 }
      : { trust: 0, friendship: 0 };

  return {
    narrative,
    newEvents,
    npcReactions,
    newMemories,
    relationshipDelta,
  };
}
