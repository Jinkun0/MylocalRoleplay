import type {
  WorldState,
  SaveSnapshot,
  SnapshotMeta,
  DbAdapter,
  SnapshotMetaShallow,
  UUID,
} from "./types/index";
import { CURRENT_SAVE_FORMAT_VERSION, WORLD_CORE_VERSION } from "./createNewWorld";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// VersionMismatchError
// ---------------------------------------------------------------------------

export class VersionMismatchError extends Error {
  readonly name = "VersionMismatchError" as const;
  constructor(
    public readonly snapshotVersion: string,
    public readonly expectedVersion: string,
  ) {
    super(
      `Save-format version mismatch: snapshot="${snapshotVersion}", expected="${expectedVersion}"`,
    );
  }
}

// ---------------------------------------------------------------------------
// createSnapshot
// ---------------------------------------------------------------------------

export interface CreateSnapshotOptions {
  /** How the snapshot was triggered. Defaults to "manual". */
  source?: string;
}

/**
 * Serialise a WorldState into a SaveSnapshot (pure, no I/O).
 * The snapshot is a deep clone so the caller's WorldState is never mutated.
 */
export function createSnapshot(
  worldState: WorldState,
  options?: CreateSnapshotOptions,
): SaveSnapshot {
  const snapshotMeta: SnapshotMeta = {
    snapshotId: genUUID(),
    saveFormatVersion: CURRENT_SAVE_FORMAT_VERSION,
    worldCoreVersion: WORLD_CORE_VERSION,
    createdAt: new Date().toISOString(),
    tickIndex: worldState.meta.tickIndex,
    source: options?.source ?? "manual",
  };

  return {
    snapshotMeta,
    worldState: structuredClone(worldState),
  };
}

// ---------------------------------------------------------------------------
// loadSnapshot
// ---------------------------------------------------------------------------

export interface LoadSnapshotOptions {
  /**
   * When true, a save-format version mismatch is tolerated and the
   * WorldState is returned as-is.  Defaults to false.
   */
  ignoreVersionMismatch?: boolean;
}

/**
 * Deserialise a SaveSnapshot back to a WorldState (pure, no I/O).
 * Throws `VersionMismatchError` when the snapshot's saveFormatVersion differs
 * from CURRENT_SAVE_FORMAT_VERSION, unless `ignoreVersionMismatch` is set.
 */
export function loadSnapshot(
  snapshot: SaveSnapshot,
  options?: LoadSnapshotOptions,
): WorldState {
  const { snapshotMeta, worldState } = snapshot;

  if (snapshotMeta.saveFormatVersion !== CURRENT_SAVE_FORMAT_VERSION) {
    if (!options?.ignoreVersionMismatch) {
      throw new VersionMismatchError(
        snapshotMeta.saveFormatVersion,
        CURRENT_SAVE_FORMAT_VERSION,
      );
    }
  }

  return structuredClone(worldState);
}

// ---------------------------------------------------------------------------
// InMemoryDbAdapter
// ---------------------------------------------------------------------------

/**
 * Simple in-memory implementation of DbAdapter.
 * Suitable for testing and ephemeral sessions; does not persist to disk.
 */
export function createInMemoryDbAdapter(): DbAdapter {
  const store = new Map<UUID, SaveSnapshot>();

  async function persistSnapshot(snapshot: SaveSnapshot): Promise<{ snapshotId: UUID }> {
    const clone = structuredClone(snapshot);
    store.set(clone.snapshotMeta.snapshotId, clone);
    return { snapshotId: clone.snapshotMeta.snapshotId };
  }

  async function loadSnapshotById(snapshotId: UUID): Promise<SaveSnapshot | null> {
    const found = store.get(snapshotId);
    return found ? structuredClone(found) : null;
  }

  async function listSnapshots(worldId: UUID): Promise<SnapshotMetaShallow[]> {
    const results: SnapshotMetaShallow[] = [];
    for (const snap of store.values()) {
      if (snap.worldState.meta.worldId === worldId) {
        const { snapshotId, saveFormatVersion, createdAt, tickIndex } = snap.snapshotMeta;
        results.push({ snapshotId, saveFormatVersion, createdAt, tickIndex });
      }
    }
    // newest first
    results.sort((a, b) => b.tickIndex - a.tickIndex);
    return results;
  }

  return {
    persistSnapshot,
    loadSnapshot: loadSnapshotById,
    listSnapshots,
  };
}
