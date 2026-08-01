import type { WorldState, WorldMeta, ISODateString, SemVer } from "./types/index";

export const CURRENT_SAVE_FORMAT_VERSION: SemVer = "1.0.0";
export const WORLD_CORE_VERSION: SemVer = "0.1.0";

function nowISO(): ISODateString {
  return new Date().toISOString();
}

function genUUID(): string {
  try {
    // @ts-ignore
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      // @ts-ignore
      return crypto.randomUUID();
    }
  } catch {}
  return `uid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface CreateWorldOptions {
  name: string;
  worldId?: string;
  seed?: string;
}

export function createNewWorld(options: CreateWorldOptions, initialState?: Partial<WorldState>): WorldState {
  const worldId = options.worldId ?? genUUID();
  const now = nowISO();

  const meta: WorldMeta = {
    worldId,
    name: options.name,
    saveFormatVersion: CURRENT_SAVE_FORMAT_VERSION,
    worldCoreVersion: WORLD_CORE_VERSION,
    createdAt: now,
    updatedAt: now,
    tickIndex: 0,
  };

  const base: WorldState = {
    meta,
    globals: initialState?.globals ?? {},
    entities: initialState?.entities ?? {},
    relationships: initialState?.relationships ?? {},
    modules: initialState?.modules ?? {},
    eventHistoryMeta: initialState?.eventHistoryMeta ?? [],
  } as WorldState;

  return base;
}
