import type { WorldState } from "@workspace/world-core";
import { CURRENT_SAVE_FORMAT_VERSION, WORLD_CORE_VERSION } from "@workspace/world-core";
import type { worldStateTable } from "@workspace/db";

type DbWorldStateRow = typeof worldStateTable.$inferSelect;

/**
 * Maps a `world_state` DB row to the canonical WorldState defined by world-core.
 *
 * The mapping is intentionally partial: entities and relationships are left empty
 * because they are stored in separate tables (npcs, relationships) and are not yet
 * normalised into the Entity model. The DB remains the source of truth for those
 * tables; only the scalar world-state fields are transcribed here.
 */
export function dbRowToWorldState(row: DbWorldStateRow): WorldState {
  return {
    meta: {
      worldId: String(row.id),
      name: "MylocalRoleplay",
      saveFormatVersion: CURRENT_SAVE_FORMAT_VERSION,
      worldCoreVersion: WORLD_CORE_VERSION,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      tickIndex: row.worldDay,
    },
    globals: {
      time: {
        tickIndex: row.worldDay,
        calendarDate: row.worldTime,
      },
      settings: {
        weather: row.weather,
        currentLocationId: row.currentLocationId,
        activeMode: row.activeMode,
        isRunning: row.isRunning,
      },
    },
    entities: {},
    relationships: {},
  };
}

/**
 * Extracts the mutable scalar fields from a canonical WorldState and returns
 * an object suitable for use in a Drizzle `update().set(...)` call on
 * `worldStateTable`. Only fields that exist in the DB schema are included.
 */
export function worldStateToDbUpdate(
  ws: WorldState,
): Partial<Omit<DbWorldStateRow, "id" | "createdAt">> {
  const settings = ws.globals?.settings as
    | {
        weather?: string;
        currentLocationId?: number;
        activeMode?: string;
        isRunning?: boolean;
      }
    | undefined;

  const result: Partial<Omit<DbWorldStateRow, "id" | "createdAt">> = {};

  if (ws.globals?.time?.tickIndex !== undefined) {
    result.worldDay = ws.globals.time.tickIndex;
  }
  if (ws.globals?.time?.calendarDate !== undefined) {
    result.worldTime = ws.globals.time.calendarDate;
  }
  if (settings?.weather !== undefined) {
    result.weather = settings.weather;
  }
  if (settings?.currentLocationId !== undefined) {
    result.currentLocationId = settings.currentLocationId;
  }
  if (settings?.activeMode !== undefined) {
    result.activeMode = settings.activeMode;
  }
  if (settings?.isRunning !== undefined) {
    result.isRunning = settings.isRunning;
  }

  return result;
}
