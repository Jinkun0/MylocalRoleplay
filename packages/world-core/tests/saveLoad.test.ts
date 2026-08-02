import { describe, it, expect } from "vitest";
import { createNewWorld, CURRENT_SAVE_FORMAT_VERSION } from "../src/createNewWorld";
import {
  createSnapshot,
  loadSnapshot,
  VersionMismatchError,
  createInMemoryDbAdapter,
} from "../src/saveLoad";
import type { SaveSnapshot } from "../src/types/index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWorld(name = "TestWorld") {
  return createNewWorld({ name });
}

// ---------------------------------------------------------------------------
// createSnapshot
// ---------------------------------------------------------------------------

describe("createSnapshot", () => {
  it("wraps a WorldState in a SaveSnapshot", () => {
    const world = makeWorld();
    const snap = createSnapshot(world);
    expect(snap.worldState).toBeDefined();
    expect(snap.snapshotMeta).toBeDefined();
  });

  it("copies the tickIndex from WorldState", () => {
    const world = makeWorld();
    world.meta.tickIndex = 42;
    const snap = createSnapshot(world);
    expect(snap.snapshotMeta.tickIndex).toBe(42);
  });

  it("uses 'manual' as default source", () => {
    const snap = createSnapshot(makeWorld());
    expect(snap.snapshotMeta.source).toBe("manual");
  });

  it("accepts a custom source", () => {
    const snap = createSnapshot(makeWorld(), { source: "autosave" });
    expect(snap.snapshotMeta.source).toBe("autosave");
  });

  it("sets saveFormatVersion to CURRENT_SAVE_FORMAT_VERSION", () => {
    const snap = createSnapshot(makeWorld());
    expect(snap.snapshotMeta.saveFormatVersion).toBe(CURRENT_SAVE_FORMAT_VERSION);
  });

  it("assigns a non-empty snapshotId", () => {
    const snap = createSnapshot(makeWorld());
    expect(snap.snapshotMeta.snapshotId).toBeTruthy();
  });

  it("produces a deep clone — mutating original world does not affect snapshot", () => {
    const world = makeWorld("Original");
    const snap = createSnapshot(world);
    world.meta.name = "Mutated";
    expect(snap.worldState.meta.name).toBe("Original");
  });

  it("produces a deep clone — mutating snapshot worldState does not affect original", () => {
    const world = makeWorld("Original");
    const snap = createSnapshot(world);
    snap.worldState.meta.name = "MutatedSnap";
    expect(world.meta.name).toBe("Original");
  });

  it("two snapshots from the same world get different snapshotIds", () => {
    const world = makeWorld();
    const s1 = createSnapshot(world);
    const s2 = createSnapshot(world);
    expect(s1.snapshotMeta.snapshotId).not.toBe(s2.snapshotMeta.snapshotId);
  });
});

// ---------------------------------------------------------------------------
// loadSnapshot
// ---------------------------------------------------------------------------

describe("loadSnapshot", () => {
  it("returns the WorldState from a valid snapshot", () => {
    const world = makeWorld("LoadMe");
    const snap = createSnapshot(world);
    const loaded = loadSnapshot(snap);
    expect(loaded.meta.name).toBe("LoadMe");
  });

  it("returns a deep clone — mutating result does not affect snapshot", () => {
    const snap = createSnapshot(makeWorld("Stable"));
    const loaded = loadSnapshot(snap);
    loaded.meta.name = "Changed";
    expect(snap.worldState.meta.name).toBe("Stable");
  });

  it("throws VersionMismatchError when saveFormatVersion differs", () => {
    const world = makeWorld();
    const snap = createSnapshot(world);
    const tampered: SaveSnapshot = {
      ...snap,
      snapshotMeta: { ...snap.snapshotMeta, saveFormatVersion: "0.0.1" },
    };
    expect(() => loadSnapshot(tampered)).toThrow(VersionMismatchError);
  });

  it("VersionMismatchError carries snapshotVersion and expectedVersion", () => {
    const world = makeWorld();
    const snap = createSnapshot(world);
    const tampered: SaveSnapshot = {
      ...snap,
      snapshotMeta: { ...snap.snapshotMeta, saveFormatVersion: "0.0.1" },
    };
    let err: VersionMismatchError | undefined;
    try {
      loadSnapshot(tampered);
    } catch (e) {
      if (e instanceof VersionMismatchError) err = e;
    }
    expect(err).toBeDefined();
    expect(err?.snapshotVersion).toBe("0.0.1");
    expect(err?.expectedVersion).toBe(CURRENT_SAVE_FORMAT_VERSION);
  });

  it("ignores version mismatch when ignoreVersionMismatch is true", () => {
    const world = makeWorld("IgnoreMe");
    const snap = createSnapshot(world);
    const tampered: SaveSnapshot = {
      ...snap,
      snapshotMeta: { ...snap.snapshotMeta, saveFormatVersion: "0.0.1" },
    };
    const loaded = loadSnapshot(tampered, { ignoreVersionMismatch: true });
    expect(loaded.meta.name).toBe("IgnoreMe");
  });

  it("VersionMismatchError name is 'VersionMismatchError'", () => {
    const err = new VersionMismatchError("0.0.1", CURRENT_SAVE_FORMAT_VERSION);
    expect(err.name).toBe("VersionMismatchError");
  });
});

// ---------------------------------------------------------------------------
// createInMemoryDbAdapter
// ---------------------------------------------------------------------------

describe("createInMemoryDbAdapter", () => {
  it("persists and retrieves a snapshot by id", async () => {
    const adapter = createInMemoryDbAdapter();
    const snap = createSnapshot(makeWorld("AdapterWorld"));
    const { snapshotId } = await adapter.persistSnapshot(snap);
    const retrieved = await adapter.loadSnapshot(snapshotId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.worldState.meta.name).toBe("AdapterWorld");
  });

  it("returns null for an unknown snapshotId", async () => {
    const adapter = createInMemoryDbAdapter();
    const result = await adapter.loadSnapshot("non-existent-id");
    expect(result).toBeNull();
  });

  it("returns a deep clone — mutating retrieved snapshot does not affect stored one", async () => {
    const adapter = createInMemoryDbAdapter();
    const snap = createSnapshot(makeWorld("Immutable"));
    const { snapshotId } = await adapter.persistSnapshot(snap);
    const first = await adapter.loadSnapshot(snapshotId);
    first!.worldState.meta.name = "Mutated";
    const second = await adapter.loadSnapshot(snapshotId);
    expect(second?.worldState.meta.name).toBe("Immutable");
  });

  it("listSnapshots returns only snapshots for the given worldId", async () => {
    const adapter = createInMemoryDbAdapter();
    const w1 = makeWorld("World1");
    const w2 = makeWorld("World2");
    await adapter.persistSnapshot(createSnapshot(w1));
    await adapter.persistSnapshot(createSnapshot(w2));
    const list = await adapter.listSnapshots!(w1.meta.worldId);
    expect(list.length).toBe(1);
  });

  it("listSnapshots returns all snapshots for a world across multiple saves", async () => {
    const adapter = createInMemoryDbAdapter();
    const world = makeWorld("MultiSave");
    world.meta.tickIndex = 0;
    await adapter.persistSnapshot(createSnapshot(world));
    world.meta.tickIndex = 1;
    await adapter.persistSnapshot(createSnapshot(world));
    world.meta.tickIndex = 2;
    await adapter.persistSnapshot(createSnapshot(world));
    const list = await adapter.listSnapshots!(world.meta.worldId);
    expect(list.length).toBe(3);
  });

  it("listSnapshots returns results sorted newest (highest tickIndex) first", async () => {
    const adapter = createInMemoryDbAdapter();
    const world = makeWorld("SortTest");
    for (let i = 0; i < 3; i++) {
      world.meta.tickIndex = i;
      await adapter.persistSnapshot(createSnapshot(world));
    }
    const list = await adapter.listSnapshots!(world.meta.worldId);
    expect(list[0].tickIndex).toBeGreaterThanOrEqual(list[1].tickIndex);
    expect(list[1].tickIndex).toBeGreaterThanOrEqual(list[2].tickIndex);
  });

  it("each persisted snapshot gets the snapshotId from snapshotMeta", async () => {
    const adapter = createInMemoryDbAdapter();
    const snap = createSnapshot(makeWorld("IdCheck"));
    const { snapshotId } = await adapter.persistSnapshot(snap);
    expect(snapshotId).toBe(snap.snapshotMeta.snapshotId);
  });
});
