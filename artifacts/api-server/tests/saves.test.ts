/**
 * Integration tests for the saves routes.
 *
 * Verifies:
 *  - POST /saves calls createSnapshot() and persists a snapshot with snapshotMeta
 *  - POST /saves/:id/load on a modern snapshot calls loadSnapshot()
 *  - POST /saves/:id/load on a legacy snapshot (no snapshotMeta) uses the legacy path
 *  - POST /saves/:id/load on a modern snapshot with a version mismatch returns HTTP 409
 *    and does NOT fall back to the legacy path
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import express from "express";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

// ---------------------------------------------------------------------------
// Hoisted mock objects (must be created before vi.mock factories run)
// ---------------------------------------------------------------------------

const {
  mockDb,
  mockCreateSnapshot,
  mockLoadSnapshot,
  MockVersionMismatchError,
  mockDbRowToWorldState,
  mockWorldStateToDbUpdate,
} = vi.hoisted(() => {
  class MockVersionMismatchError extends Error {
    readonly name = "VersionMismatchError" as const;
    constructor(
      public readonly snapshotVersion: string,
      public readonly expectedVersion: string,
    ) {
      super(`Save-format version mismatch: snapshot="${snapshotVersion}", expected="${expectedVersion}"`);
    }
  }

  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  return {
    mockDb,
    mockCreateSnapshot: vi.fn(),
    mockLoadSnapshot: vi.fn(),
    MockVersionMismatchError,
    mockDbRowToWorldState: vi.fn(),
    mockWorldStateToDbUpdate: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@workspace/db", () => ({
  db: mockDb,
  savesTable: Symbol("savesTable"),
  worldStateTable: Symbol("worldStateTable"),
  locationsTable: Symbol("locationsTable"),
  eq: vi.fn((_col: unknown, _val: unknown) => ({ col: _col, val: _val })),
}));

vi.mock("@workspace/world-core", () => ({
  createSnapshot: mockCreateSnapshot,
  loadSnapshot: mockLoadSnapshot,
  VersionMismatchError: MockVersionMismatchError,
  CURRENT_SAVE_FORMAT_VERSION: "1.0.0",
  WORLD_CORE_VERSION: "0.1.0",
}));

vi.mock("@workspace/api-zod", () => ({
  CreateSaveBody: { safeParse: vi.fn((x: unknown) => ({ success: true, data: x })) },
  DeleteSaveParams: { safeParse: vi.fn((x: unknown) => ({ success: true, data: x })) },
  LoadSaveParams: { safeParse: vi.fn((x: unknown) => ({ success: true, data: x })) },
  ListSavesResponse: { parse: vi.fn((x: unknown) => x) },
  CreateSaveResponse: { parse: vi.fn((x: unknown) => x) },
  LoadSaveResponse: { parse: vi.fn((x: unknown) => x) },
}));

vi.mock("../src/lib/worldStateMapper", () => ({
  dbRowToWorldState: mockDbRowToWorldState,
  worldStateToDbUpdate: mockWorldStateToDbUpdate,
}));

vi.mock("../src/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Import router AFTER mocks are in place
// ---------------------------------------------------------------------------

import savesRouter from "../src/routes/saves";

// ---------------------------------------------------------------------------
// Test server
// ---------------------------------------------------------------------------

let baseUrl: string;
let server: ReturnType<typeof createServer>;

beforeAll(
  () =>
    new Promise<void>((resolve) => {
      const app = express();
      app.use(express.json());
      app.use("/", savesRouter);
      server = createServer(app);
      server.listen(0, () => {
        baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;
        resolve();
      });
    }),
);

afterAll(
  () =>
    new Promise<void>((resolve) => {
      server.close(() => resolve());
    }),
);

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockDbState = {
  id: 1, worldDay: 3, worldTime: "12:00", weather: "clear",
  currentLocationId: 2, activeMode: "novel", isRunning: true,
  createdAt: new Date(), updatedAt: new Date(),
};

const mockLocation = { id: 2, name: "Test Location" };

const mockCreatedSave = {
  id: 42, name: "My Save", worldDay: 3, worldTime: "12:00",
  locationName: "Test Location", createdAt: new Date(),
};

const mockRestoredState = { ...mockDbState, id: 1 };

const mockSaveSnapshot = {
  snapshotMeta: {
    snapshotId: "snap-1", saveFormatVersion: "1.0.0",
    worldCoreVersion: "0.1.0", createdAt: new Date().toISOString(),
    tickIndex: 3, source: "manual",
  },
  worldState: { meta: { worldId: "w1" }, globals: {}, entities: {} },
};

/** A saved row whose snapshot is a fully modern SaveSnapshot */
const modernSave = {
  id: 1, name: "Modern", worldDay: 3, worldTime: "12:00",
  locationName: "Test Location", createdAt: new Date(),
  snapshot: { ...mockSaveSnapshot },
};

/** A saved row whose snapshot was written before world-core integration (no snapshotMeta) */
const legacySave = {
  id: 2, name: "Legacy", worldDay: 5, worldTime: "18:00",
  locationName: "Old Place", createdAt: new Date(),
  snapshot: { worldDay: 5, worldTime: "18:00", currentLocationId: 7 },
};

/** A saved row whose snapshot has snapshotMeta but with an incompatible version */
const mismatchSave = {
  id: 3, name: "Mismatch", worldDay: 2, worldTime: "10:00",
  locationName: "Somewhere", createdAt: new Date(),
  snapshot: {
    snapshotMeta: {
      snapshotId: "snap-old", saveFormatVersion: "0.0.1",
      worldCoreVersion: "0.0.1", createdAt: new Date().toISOString(),
      tickIndex: 2, source: "manual",
    },
    worldState: { meta: { worldId: "w2" }, globals: {}, entities: {} },
  },
};

// ---------------------------------------------------------------------------
// Proxy chain helper — creates a Drizzle-like fluent mock
// ---------------------------------------------------------------------------

function makeChain<T>(value: T[]): Record<string | symbol, unknown> {
  const p = Promise.resolve(value);
  const target: Record<string | symbol, unknown> = {
    then: p.then.bind(p),
    catch: p.catch.bind(p),
    finally: p.finally.bind(p),
    returning: () => p,
  };
  const proxy: typeof target = new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop];
      if (typeof prop === "symbol") return undefined;
      return () => proxy;
    },
  });
  return proxy;
}

// ---------------------------------------------------------------------------
// POST /saves — should call createSnapshot()
// ---------------------------------------------------------------------------

describe("POST /saves", () => {
  it("calls createSnapshot() and stores a snapshot with snapshotMeta", async () => {
    const mappedState = { meta: { worldId: "w1" }, globals: {}, entities: {} };
    mockDbRowToWorldState.mockReturnValue(mappedState);
    mockCreateSnapshot.mockReturnValue(mockSaveSnapshot);
    const valuesSpy = vi.fn(() => makeChain([mockCreatedSave]));

    mockDb.select
      .mockReturnValueOnce(makeChain([mockDbState])) // worldState query
      .mockReturnValueOnce(makeChain([mockLocation])); // location query
    mockDb.insert.mockReturnValue({ values: valuesSpy });

    const res = await fetch(`${baseUrl}/saves`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "My Save" }),
    });

    expect(res.status).toBe(201);
    expect(mockCreateSnapshot).toHaveBeenCalledOnce();
    expect(valuesSpy).toHaveBeenCalledWith(expect.objectContaining({
      snapshot: expect.objectContaining({
        snapshotMeta: mockSaveSnapshot.snapshotMeta,
      }),
    }));
  });
});

// ---------------------------------------------------------------------------
// POST /saves/:id/load — modern valid snapshot
// ---------------------------------------------------------------------------

describe("POST /saves/:id/load — modern valid snapshot", () => {
  it("calls loadSnapshot() and updates world state", async () => {
    mockLoadSnapshot.mockReturnValue({ meta: {}, globals: {}, entities: {} });
    mockWorldStateToDbUpdate.mockReturnValue({
      worldDay: 3, worldTime: "12:00", currentLocationId: 2,
    });

    mockDb.select
      .mockReturnValueOnce(makeChain([modernSave]))          // get save by id
      .mockReturnValueOnce(makeChain([mockDbState]))          // get existing worldState
      .mockReturnValueOnce(makeChain([mockLocation]));        // get location
    mockDb.update.mockReturnValue(makeChain([mockRestoredState]));

    const res = await fetch(`${baseUrl}/saves/1/load`, { method: "POST" });

    expect(res.status).toBe(200);
    expect(mockLoadSnapshot).toHaveBeenCalledOnce();
    // Legacy path must not be exercised: loadSnapshot was called, not skipped
    expect(mockLoadSnapshot).toHaveBeenCalledWith(modernSave.snapshot);
  });
});

// ---------------------------------------------------------------------------
// POST /saves/:id/load — legacy snapshot (no snapshotMeta)
// ---------------------------------------------------------------------------

describe("POST /saves/:id/load — legacy snapshot", () => {
  it("does NOT call loadSnapshot() and uses raw save fields instead", async () => {
    mockDb.select
      .mockReturnValueOnce(makeChain([legacySave]))           // get save by id
      .mockReturnValueOnce(makeChain([mockDbState]))           // get existing worldState
      .mockReturnValueOnce(makeChain([mockLocation]));         // get location
    mockDb.update.mockReturnValue(makeChain([mockRestoredState]));

    const res = await fetch(`${baseUrl}/saves/2/load`, { method: "POST" });

    expect(res.status).toBe(200);
    // loadSnapshot must never be called for a legacy snapshot
    expect(mockLoadSnapshot).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// POST /saves/:id/load — modern snapshot with incompatible version
// ---------------------------------------------------------------------------

describe("POST /saves/:id/load — modern snapshot with version mismatch", () => {
  it("returns HTTP 409 and does NOT fall back to the legacy path", async () => {
    // loadSnapshot throws a VersionMismatchError
    mockLoadSnapshot.mockImplementation(() => {
      throw new MockVersionMismatchError("0.0.1", "1.0.0");
    });

    mockDb.select
      .mockReturnValueOnce(makeChain([mismatchSave]))          // get save by id
      .mockReturnValueOnce(makeChain([mockDbState]));           // get existing worldState (may be read)

    const res = await fetch(`${baseUrl}/saves/3/load`, { method: "POST" });

    expect(res.status).toBe(409);

    // Must not have attempted a DB update (no legacy fallback executed)
    expect(mockDb.update).not.toHaveBeenCalled();
    expect(mockDb.insert).not.toHaveBeenCalled();
  });
});
