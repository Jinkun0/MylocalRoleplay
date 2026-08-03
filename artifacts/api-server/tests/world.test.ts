/**
 * Integration tests for the world routes.
 *
 * Verifies:
 *  - GET /world/state calls createNewWorld() when no world state row exists yet
 *  - GET /world/state does NOT call createNewWorld() when a row already exists
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import express from "express";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

// ---------------------------------------------------------------------------
// Hoisted mock objects
// ---------------------------------------------------------------------------

const { mockDb, mockCreateNewWorld, mockWorldStateToDbUpdate } = vi.hoisted(() => ({
  mockDb: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
  mockCreateNewWorld: vi.fn(),
  mockWorldStateToDbUpdate: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@workspace/db", () => ({
  db: mockDb,
  worldStateTable: Symbol("worldStateTable"),
  locationsTable: Symbol("locationsTable"),
  npcsTable: Symbol("npcsTable"),
  eventsTable: Symbol("eventsTable"),
  memoryTable: Symbol("memoryTable"),
  relationshipsTable: Symbol("relationshipsTable"),
  eq: vi.fn((_col: unknown, _val: unknown) => ({ col: _col, val: _val })),
}));

vi.mock("@workspace/world-core", () => ({
  createNewWorld: mockCreateNewWorld,
  CURRENT_SAVE_FORMAT_VERSION: "1.0.0",
  WORLD_CORE_VERSION: "0.1.0",
}));

vi.mock("@workspace/api-zod", () => ({
  GetWorldStateResponse: { parse: vi.fn((x: unknown) => x) },
  TickWorldBody: { safeParse: vi.fn((x: unknown) => ({ success: true, data: x })) },
  TickWorldResponse: { parse: vi.fn((x: unknown) => x) },
  GetWorldSummaryResponse: { parse: vi.fn((x: unknown) => x) },
  ListLocationsResponse: { parse: vi.fn((x: unknown) => x) },
  GetLocationParams: { safeParse: vi.fn((x: unknown) => ({ success: true, data: x })) },
  GetLocationResponse: { parse: vi.fn((x: unknown) => x) },
}));

vi.mock("../src/lib/worldStateMapper", () => ({
  worldStateToDbUpdate: mockWorldStateToDbUpdate,
}));

vi.mock("../src/lib/world-engine", () => ({
  generateNpcTick: vi.fn(async () => []),
  advanceWorldTime: vi.fn((_day: number, time: string, _mins: number) => ({ day: 1, time })),
}));

vi.mock("../src/lib/llm-narrator", () => ({
  generateTickNarrative: vi.fn(async () => "narrative"),
}));

vi.mock("../src/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Import router AFTER mocks
// ---------------------------------------------------------------------------

import worldRouter from "../src/routes/world";

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
      app.use("/", worldRouter);
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
// Proxy chain helper
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
// Fixtures
// ---------------------------------------------------------------------------

const mockWorldStateRow = {
  id: 1, worldDay: 1, worldTime: "08:00", weather: "clear",
  currentLocationId: 1, activeMode: "novel", isRunning: true,
  createdAt: new Date(), updatedAt: new Date(),
};

const mockLocation = { id: 1, name: "Starting Village" };

// ---------------------------------------------------------------------------
// GET /world/state — bootstrap (no existing row)
// ---------------------------------------------------------------------------

describe("GET /world/state — bootstrap", () => {
  it("calls createNewWorld() when no world state row exists and inserts a new row", async () => {
    const mockWs = { meta: { worldId: "w1" }, globals: {}, entities: {} };
    mockCreateNewWorld.mockReturnValue(mockWs);
    mockWorldStateToDbUpdate.mockReturnValue({ worldDay: 1, worldTime: "08:00" });

    mockDb.select
      .mockReturnValueOnce(makeChain([]))                   // worldState not found
      .mockReturnValueOnce(makeChain([mockLocation]))        // first location
      .mockReturnValueOnce(makeChain([mockLocation]));       // location for response
    mockDb.insert.mockReturnValue(makeChain([mockWorldStateRow]));

    const res = await fetch(`${baseUrl}/world/state`);

    expect(res.status).toBe(200);
    expect(mockCreateNewWorld).toHaveBeenCalledOnce();
    expect(mockCreateNewWorld).toHaveBeenCalledWith({ name: "MylocalRoleplay" });
    expect(mockDb.insert).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// GET /world/state — existing row
// ---------------------------------------------------------------------------

describe("GET /world/state — existing world", () => {
  it("does NOT call createNewWorld() when a world state row already exists", async () => {
    mockDb.select
      .mockReturnValueOnce(makeChain([mockWorldStateRow]))   // worldState found
      .mockReturnValueOnce(makeChain([mockLocation]));        // location for response

    const res = await fetch(`${baseUrl}/world/state`);

    expect(res.status).toBe(200);
    expect(mockCreateNewWorld).not.toHaveBeenCalled();
    expect(mockDb.insert).not.toHaveBeenCalled();
  });
});
