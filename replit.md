# Narrative Simulation Engine

Un motore di simulazione narrativa modulare. Il mondo vive autonomamente: gli NPC seguono routine, gli eventi si dispiegano nel tempo, la memoria persiste. Il giocatore interagisce tramite una chat narrativa.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — avvia il server API (porta 8080)
- `pnpm --filter @workspace/narrative-engine run dev` — avvia il frontend (porta 25782)
- `pnpm run typecheck` — typecheck completo
- `pnpm --filter @workspace/api-spec run codegen` — rigenera hook React Query e schemi Zod dall'OpenAPI spec
- `pnpm --filter @workspace/db run push` — pusha le modifiche dello schema DB (solo dev)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (zod/v4), drizzle-zod
- API codegen: Orval (da OpenAPI spec)
- Frontend: React + Vite + TailwindCSS v4 + Framer Motion
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — contratto OpenAPI (source of truth)
- `lib/db/src/schema/` — schema Drizzle per tabella (world_state, locations, npcs, memory, relationships, events, narrative, saves, settings)
- `artifacts/api-server/src/routes/` — route handler per dominio (world, npcs, events, memory, narrative, relationships, saves, settings)
- `artifacts/api-server/src/lib/world-engine.ts` — logica tick del mondo (avanzamento tempo, routine NPC)
- `artifacts/api-server/src/lib/narrative-engine.ts` — generazione risposta narrativa
- `artifacts/narrative-engine/src/pages/` — pagine React (Home, World, Npcs, NpcProfile, Events, Memory, Relationships, Saves, Settings)

## Architecture decisions

- **OpenAPI-first**: ogni endpoint è definito nello spec prima di implementarlo; i hook React Query e gli schemi Zod vengono generati da Orval automaticamente.
- **Engine modulari**: World Engine, NPC Engine, Narrative Engine, Memory Engine, Relationship Engine, Event Engine sono implementati come moduli separati nel backend — ognuno con responsabilità chiara.
- **Mondo autonomo**: il tick (`POST /world/tick`) fa avanzare il tempo, aggiorna le routine degli NPC, sposta i personaggi tra location e genera eventi autonomamente.
- **Memoria non onnisciente**: ogni NPC ha la propria tabella di memoria separata. Quello che un NPC conosce è distinto da quello che conosce un altro.
- **Zod v3 compat**: tutti i tipi `integer` nell'OpenAPI spec sono dichiarati come `number` (non `integer`) per compatibilità con Zod v3, che non ha `zod.int()`.

## Product

- Chat narrativa principale (`/`) — il giocatore scrive azioni, il motore risponde con narrazione
- Dashboard mondo (`/world`) — stato corrente: tempo, meteo, location, NPC presenti, eventi attivi
- Roster NPC (`/npcs`) — tutti i personaggi con location e stato emotivo corrente
- Profilo NPC (`/npcs/:id`) — scheda completa: personalità, obiettivi, routine, segreti, memoria, relazioni
- Timeline eventi (`/events`) — log di tutto ciò che è accaduto nel mondo
- Log memoria (`/memory`) — traccia delle memorie del mondo e degli NPC
- Mappa relazioni (`/relationships`) — rapporto del giocatore con ogni NPC (trust, respect, suspicion, friendship, rivalry)
- Salvataggi (`/saves`) — salva e carica lo stato del mondo
- Impostazioni (`/settings`) — modalità (novel/rpg/advanced/auto), velocità narrativa, auto-tick

## User preferences

- Sviluppo incrementale per fasi — non introdurre funzionalità future prima che quelle attuali siano stabili.
- La stabilità viene prima della quantità di funzioni.
- Ogni fase deve produrre un'app funzionante e testabile.
- Lingua italiana per contenuti narrativi e seed data.
- Niente emoji nell'interfaccia.

## Gotchas

- Dopo ogni modifica all'OpenAPI spec, rieseguire `pnpm --filter @workspace/api-spec run codegen` prima di usare i tipi aggiornati.
- Se il typecheck del api-server fallisce con "has no exported member", eseguire prima `pnpm run typecheck:libs` per rigenerare le dichiarazioni delle lib.
- Non usare `type: integer` nell'OpenAPI spec — usare `type: number`. Orval genera `zod.int()` per integer, che non esiste in Zod v3.
- I tipi `["integer", "null"]` devono essere `["number", "null"]` per lo stesso motivo.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Roadmap completa in 15 fasi documentata nella conversazione iniziale
