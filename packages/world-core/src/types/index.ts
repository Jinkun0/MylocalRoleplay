export type UUID = string;
export type ISODateString = string;
export type SemVer = string;

/**
 * Snapshot meta (top-level metadata for a SaveSnapshot)
 */
export interface SnapshotMeta {
  snapshotId: UUID;
  saveFormatVersion: SemVer; // e.g. "1.0.0"
  worldCoreVersion: SemVer;
  createdAt: ISODateString;
  tickIndex: number;
  source: string; // "manual" | "autosave" | custom
  checksum?: string; // optional sha256
}

/**
 * WorldState (single source of truth)
 */
export interface WorldMeta {
  worldId: UUID;
  name: string;
  saveFormatVersion: SemVer;
  worldCoreVersion: SemVer;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  tickIndex: number;
}

export interface Globals {
  time?: {
    tickIndex?: number;
    calendarDate?: string;
  };
  settings?: Record<string, unknown>;
}

/**
 * Component-based Entity (canonical)
 */
export interface Entity {
  id: UUID;
  type: string; // "location" | "item" | "npc" | "player" | ...
  templateRef?: string;
  components?: Record<string, unknown>; // module-defined payloads
  ownerId?: UUID;
  locationId?: UUID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/**
 * NPC is implemented as an Entity with a components["npcProfile"].
 * The helper NPCProfile describes the expected shape (V1 minimal).
 */
export interface Goal {
  id: UUID;
  description: string;
  priority: number;
  createdAt?: ISODateString;
  expiry?: ISODateString;
}

export interface NPCProfile {
  name?: string;
  archetype?: string;
  traits?: Record<string, number>; // 0..1
  needs?: Record<string, number>; // 0..1
  goals?: Goal[];
  memoryRef?: UUID;
  decisionState?: {
    lastAction?: string;
    lastUpdated?: ISODateString;
  };
}

/**
 * Event (minimal)
 */
export interface Event {
  id: UUID;
  type: string;
  timestamp: ISODateString;
  tickIndex?: number;
  sourceId?: UUID;
  targetIds?: UUID[];
  payload?: unknown;
  reversible?: boolean;
}

/**
 * Memory (minimal V1)
 */
export interface MemoryEntry {
  id: UUID;
  type: string;
  content: unknown;
  timestamp: ISODateString;
  salience?: number;
}

export interface Memory {
  memoryId: UUID;
  ownerEntityId: UUID;
  entries: MemoryEntry[];
}

/**
 * Relationship (minimal)
 */
export interface Relationship {
  id: UUID;
  subjectId: UUID;
  objectId: UUID;
  type: string; // friend, enemy, neutral, patron, etc.
  strength?: number; // recommended [0..1]
  lastUpdated?: ISODateString;
}

/**
 * Module manifest (metadata only, V1)
 */
export interface ModuleManifest {
  id: string; // namespace/name
  version: SemVer;
  description?: string;
  entrypoint?: string;
  schemas?: string[];
  permissions?: string[]; // e.g. ["use-llm"]
}

/**
 * WorldState aggregate
 */
export interface WorldState {
  meta: WorldMeta;
  globals?: Globals;
  entities: Record<UUID, Entity>;
  relationships?: Record<UUID, Relationship>;
  modules?: Record<string, { id: string; version: SemVer; installedAt?: ISODateString }>;
  eventHistoryMeta?: { id: UUID; type: string; timestamp: ISODateString; tickIndex?: number }[];
}

/**
 * SaveSnapshot V1
 */
export interface SaveSnapshot {
  snapshotMeta: SnapshotMeta;
  worldState: WorldState;
}

/**
 * TimeTick minimal
 */
export interface TimeTick {
  tickIndex: number;
  wallClock?: ISODateString;
  deltaMs?: number;
  mode?: "realtime" | "batch" | "paused";
}

/**
 * LLMProvider interface (shape only)
 * - Note: implementations live outside the core and are registered as adapters.
 */
export interface LLMProvider {
  id: string;
  generate(input: { prompt: string; maxTokens?: number; deterministic?: boolean }): Promise<{ text: string }>;
  healthCheck?(): Promise<{ ok: boolean }>;
}

/**
 * DbAdapter shape (minimal)
 */
export interface SnapshotMetaShallow {
  snapshotId: UUID;
  saveFormatVersion: SemVer;
  createdAt: ISODateString;
  tickIndex: number;
}

export interface DbAdapter {
  persistSnapshot(snapshot: SaveSnapshot): Promise<{ snapshotId: UUID }>;
  loadSnapshot(snapshotId: UUID): Promise<SaveSnapshot | null>;
  listSnapshots?: (worldId: UUID) => Promise<SnapshotMetaShallow[]>;
}

/**
 * Errors (shape hints)
 */
export interface VersionMismatchError {
  name: "VersionMismatchError";
  message: string;
  snapshotVersion?: SemVer;
  expectedVersion?: SemVer;
}

export interface ValidationError {
  name: "ValidationError";
  message: string;
  details?: unknown;
}
