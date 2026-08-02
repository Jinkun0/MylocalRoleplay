# @workspace/world-core — V1 (Contratti + Runtime Minimo)

Questo package contiene i contratti canonici **e il runtime minimo** per la Fase 0.5 (V1) del motore narrativo.

Scopo
- Definire i tipi/contratti principali (WorldState, Entity, NPC, Event, Memory, Relationship, SaveSnapshot, ModuleManifest, TimeTick, LLMProvider).
- Fornire un formato snapshot V1 e la strategia di versioning associata.
- Esportare le API runtime minime del core: `createNewWorld`, `createSnapshot`, `loadSnapshot`, `createInMemoryDbAdapter`.
- Non contiene logica runtime per LLM, DB drivers, event bus, compression, sandboxing o replay.

Principio fondamentale
- Single Source of Truth: esiste UN WorldState canonico e serializzabile. NPC è una specializzazione di Entity (non due collezioni parallele).

Contenuto di questa cartella
- `src/types/` — definizioni TypeScript (interfacce) dei contratti canonici.
- `src/createNewWorld.ts` — factory `createNewWorld` e costanti di versione.
- `src/saveLoad.ts` — `createSnapshot`, `loadSnapshot`, `VersionMismatchError`, `createInMemoryDbAdapter`.
- `tests/` — test skeleton e casi minimi per: create new world, save snapshot, load snapshot con mismatch versione.

Formato snapshot (esempio minimale)

```json
{
  "snapshotMeta": {
    "snapshotId": "00000000-0000-0000-0000-000000000000",
    "saveFormatVersion": "1.0.0",
    "worldCoreVersion": "0.1.0",
    "createdAt": "2026-08-01T00:00:00Z",
    "tickIndex": 0,
    "source": "manual"
  },
  "worldState": {
    "meta": {
      "worldId": "11111111-1111-1111-1111-111111111111",
      "name": "MyWorld",
      "saveFormatVersion": "1.0.0",
      "worldCoreVersion": "0.1.0",
      "createdAt": "2026-08-01T00:00:00Z",
      "updatedAt": "2026-08-01T00:00:00Z",
      "tickIndex": 0
    },
    "globals": {},
    "entities": {}
  }
}
```

API minime (descrittive)
- initialize(options)
- registerAdapter(type, adapter)
- createNewWorld(meta, initialState?)
- createSnapshot(worldState, options?)
- loadSnapshot(snapshotId | snapshotObject, options?)
- getEntity(worldState, entityId)
- queryEntities(worldState, filter)
- upsertEntity(worldState, entityPayload)
- removeEntity(worldState, entityId)
- getNpc(worldState, entityId)
- applyEvent(worldState, event)
- advanceTick(worldState, steps = 1)
- healthCheck()

Regole di dipendenza (V1)
- Consentite:
  - uuid (generazione id)
  - zod (opzionale per validazione runtime)
  - devDeps: typescript, vitest/jest, eslint, prettier
- Vietate nel core:
  - SDK provider esterni (Anthropic/OpenAI/AWS/Replit SDK)
  - DB drivers (pg/mysql/sqlite)
  - framework web (express/fastify)
  - librerie heavy AI/ML

Criteri di accettazione V1 (prima implementazione)
- README + tipi TypeScript presenti sul branch feature/world-core-foundation
- Test skeleton per i casi minimi (create, save, load-version-mismatch)
- Runtime minimo implementato: `createNewWorld`, `createSnapshot`, `loadSnapshot`, `createInMemoryDbAdapter`
- Nessun adapter concreto per LLM, DB drivers o framework web aggiunto al core

Prossimi passi suggeriti
- Review del documento e delle interfacce TypeScript
- Se approvato, procedere con la scrittura di schemi runtime (Zod) e implementazioni in-memory minimal per i metodi API richiesti

---
