import { anthropic } from "@workspace/integrations-anthropic-ai";

const MODEL = "claude-sonnet-4-6";

export interface NpcContext {
  id: number;
  name: string;
  age: number | null;
  personality: string;
  background: string | null;
  objectives: string[];
  currentRoutine: string;
  emotionalState: string;
  knownSecrets: string[];
  relationship: {
    trust: number;
    respect: number;
    suspicion: number;
    friendship: number;
    rivalry: number;
    status: string;
  };
  memoriesAboutPlayer: string[];
}

export interface PresentNpcSummary {
  id: number;
  name: string;
  activity: string;
  emotionalState: string;
}

export interface LocationSummary {
  id: number;
  name: string;
  description: string;
}

export interface NarratorContext {
  playerText: string;
  world: {
    day: number;
    time: string;
    weather: string;
    locationName: string;
    locationDescription: string;
  };
  presentNpcs: PresentNpcSummary[];
  targetNpc: NpcContext | null;
  accessibleLocations: LocationSummary[];
  recentHistory: Array<{ role: string; text: string }>;
}

export interface NarratorResult {
  narrative: string;
  moveToLocationId: number | null;
  npcReactionLabel: string | null;
  relationshipDelta: {
    trust: number;
    respect: number;
    suspicion: number;
    friendship: number;
  } | null;
  memory: {
    content: string;
    importance: "low" | "medium" | "high" | "critical";
    isLongTerm: boolean;
  } | null;
  worldEvent: {
    title: string;
    description: string;
    type: "plot" | "social" | "consequence" | "player_action";
  } | null;
}

const NARRATE_TOOL_NAME = "narrate_action";

const NARRATE_TOOL = {
  name: NARRATE_TOOL_NAME,
  description:
    "Registra la risposta narrativa strutturata per l'azione del giocatore.",
  input_schema: {
    type: "object" as const,
    properties: {
      narrative: {
        type: "string",
        description:
          "La prosa narrativa in italiano, in seconda persona presente ('tu'), 2-5 frasi, stile letterario e atmosferico. Deve includere il dialogo diretto dell'NPC se presente.",
      },
      moveToLocationId: {
        type: ["number", "null"],
        description:
          "L'id del luogo verso cui il giocatore si sta chiaramente spostando, scelto SOLO tra quelli forniti nella lista dei luoghi accessibili. Null se il giocatore non si sta spostando.",
      },
      npcReactionLabel: {
        type: ["string", "null"],
        description:
          "Una breve etichetta (3-8 parole) che descrive la reazione fisica/emotiva visibile dell'NPC target, es. 'stringe le labbra, diffidente'. Null se non c'è un NPC target o non reagisce visibilmente.",
      },
      relationshipDelta: {
        type: ["object", "null"],
        description:
          "Variazione della relazione con l'NPC target causata da questa interazione, valori interi tra -5 e 5. Null se non c'è NPC target o l'interazione non ha impatto relazionale.",
        properties: {
          trust: { type: "number" },
          respect: { type: "number" },
          suspicion: { type: "number" },
          friendship: { type: "number" },
        },
      },
      memory: {
        type: ["object", "null"],
        description:
          "Se questo momento merita di essere ricordato, un fatto conciso e oggettivo (non prosa) da salvare in memoria. Null se l'azione è banale (es. semplice osservazione senza conseguenze).",
        properties: {
          content: {
            type: "string",
            description: "Descrizione fattuale e concisa dell'accaduto, in terza persona.",
          },
          importance: {
            type: "string",
            enum: ["low", "medium", "high", "critical"],
          },
          isLongTerm: { type: "boolean" },
        },
      },
      worldEvent: {
        type: ["object", "null"],
        description:
          "Se l'azione ha conseguenze abbastanza significative da entrare nella cronologia pubblica degli eventi del mondo, un titolo e una descrizione. Null altrimenti (la maggior parte delle interazioni non lo richiede).",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          type: {
            type: "string",
            enum: ["plot", "social", "consequence", "player_action"],
          },
        },
      },
    },
    required: ["narrative", "moveToLocationId", "npcReactionLabel", "relationshipDelta", "memory", "worldEvent"],
  },
};

const SYSTEM_PROMPT = `Sei il Narratore di un motore di simulazione narrativa: un mondo persistente e vivo, non un chatbot. Scrivi sempre in italiano, in prosa letteraria, atmosferica, in seconda persona presente rivolta al giocatore ("tu").

Regole fondamentali:
1. COERENZA: non inventare mai fatti che contraddicono il contesto fornito (personalità, memorie, relazioni, stato del mondo). Ogni NPC deve comportarsi in modo coerente con la propria personalità, il proprio stato emotivo attuale e la storia della relazione col giocatore.
2. MEMORIA: se un NPC ha ricordi rilevanti sul giocatore, deve farvi riferimento in modo naturale (un tono più freddo se la fiducia è bassa, più caloroso se c'è amicizia, sospetto se la suspicion è alta).
3. SEGRETI: i "segreti noti" di un NPC non vanno mai rivelati nella narrazione a meno che il contesto non lo giustifichi esplicitamente (fiducia molto alta, il giocatore lo scopre con un'azione mirata, o è già stato rivelato in precedenza secondo la cronologia).
4. VARIETÀ: non ripetere le stesse aperture, frasi o metafore usate nella cronologia recente. Ogni risposta deve sembrare un momento nuovo di un mondo vivo.
5. CONSEGUENZE: le interazioni significative (rivelazioni, promesse, conflitti, scoperte) devono essere marcate come memorabili o come eventi di mondo quando appropriato. Le azioni banali (osservare, camminare) di solito non lo sono.
6. SPOSTAMENTI: se il testo del giocatore indica chiaramente l'intenzione di raggiungere un altro luogo tra quelli accessibili forniti, imposta moveToLocationId di conseguenza; altrimenti lascialo null.
7. Non essere mai un assistente: non offrire aiuto, non uscire dal personaggio, non spiegare le tue scelte. Rispondi sempre e solo restando nella simulazione.

Usa sempre lo strumento fornito per rispondere, con tutti i campi richiesti.`;

function buildUserPrompt(ctx: NarratorContext): string {
  const lines: string[] = [];

  lines.push(`## Stato del mondo`);
  lines.push(`Giorno ${ctx.world.day}, ore ${ctx.world.time}. Meteo: ${ctx.world.weather}.`);
  lines.push(`Luogo attuale: ${ctx.world.locationName} — ${ctx.world.locationDescription}`);

  if (ctx.presentNpcs.length > 0) {
    lines.push(`\n## NPC presenti sulla scena`);
    for (const n of ctx.presentNpcs) {
      lines.push(`- ${n.name}: ${n.activity} (stato emotivo: ${n.emotionalState})`);
    }
  }

  lines.push(`\n## Luoghi accessibili (per eventuali spostamenti)`);
  for (const l of ctx.accessibleLocations) {
    lines.push(`- id ${l.id}: ${l.name} — ${l.description}`);
  }

  if (ctx.targetNpc) {
    const t = ctx.targetNpc;
    lines.push(`\n## NPC target dell'azione: ${t.name}`);
    lines.push(`Età: ${t.age ?? "sconosciuta"}. Personalità: ${t.personality}`);
    if (t.background) lines.push(`Background: ${t.background}`);
    if (t.objectives.length > 0) lines.push(`Obiettivi correnti: ${t.objectives.join("; ")}`);
    lines.push(`Routine attuale: ${t.currentRoutine}. Stato emotivo: ${t.emotionalState}`);
    if (t.knownSecrets.length > 0) {
      lines.push(`Segreti noti (NON rivelare salvo condizioni esplicite): ${t.knownSecrets.join("; ")}`);
    }
    lines.push(
      `Relazione col giocatore — status: ${t.relationship.status}, fiducia: ${t.relationship.trust}, rispetto: ${t.relationship.respect}, sospetto: ${t.relationship.suspicion}, amicizia: ${t.relationship.friendship}, rivalità: ${t.relationship.rivalry}`
    );
    if (t.memoriesAboutPlayer.length > 0) {
      lines.push(`Ricordi di ${t.name} sul giocatore:`);
      for (const m of t.memoriesAboutPlayer) lines.push(`  - ${m}`);
    } else {
      lines.push(`${t.name} non ha ricordi precedenti del giocatore: è il loro primo vero incontro.`);
    }
  }

  if (ctx.recentHistory.length > 0) {
    lines.push(`\n## Cronologia recente (dalla più vecchia alla più recente)`);
    for (const h of ctx.recentHistory) {
      lines.push(`[${h.role === "player" ? "Giocatore" : "Narratore"}] ${h.text}`);
    }
  }

  lines.push(`\n## Azione del giocatore`);
  lines.push(ctx.playerText);

  return lines.join("\n");
}

export async function generateNarratorResponse(ctx: NarratorContext): Promise<NarratorResult> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(ctx) }],
    tools: [NARRATE_TOOL],
    tool_choice: { type: "tool", name: NARRATE_TOOL_NAME },
  });

  const toolUse = message.content.find(
    (block): block is Extract<typeof block, { type: "tool_use" }> => block.type === "tool_use"
  );

  if (!toolUse) {
    throw new Error("Il narratore non ha prodotto una risposta strutturata valida.");
  }

  return toolUse.input as NarratorResult;
}

export async function generateTickNarrative(params: {
  day: number;
  time: string;
  weather: string;
  locationName: string;
  npcActions: Array<{ npcName: string; action: string; locationName: string }>;
}): Promise<string> {
  const actionsText =
    params.npcActions.length > 0
      ? params.npcActions.map((a) => `- ${a.npcName} ${a.action} a ${a.locationName}.`).join("\n")
      : "Nessun evento degno di nota tra gli NPC.";

  const prompt = `Sei il Narratore di un mondo simulato persistente. Il tempo è appena avanzato. Scrivi un breve passaggio letterario in italiano (2-4 frasi, terza persona, tono atmosferico) che racconti il passare del tempo in questo mondo, tessendo insieme gli eventi elencati sotto in modo naturale — non un semplice elenco. Non rivolgerti al giocatore in seconda persona: questo è un momento di transizione, un intermezzo narrativo.

Giorno ${params.day}, ore ${params.time}. Meteo: ${params.weather}. Luogo del giocatore: ${params.locationName}.

Eventi del mondo in questo intervallo:
${actionsText}`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = message.content.find(
    (block): block is Extract<typeof block, { type: "text" }> => block.type === "text"
  );

  return textBlock?.text?.trim() || "Il tempo scorre tranquillo. Il mondo respira.";
}
