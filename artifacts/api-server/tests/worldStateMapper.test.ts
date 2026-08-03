/**
 * Pure unit tests for worldStateMapper.ts.
 * No mocks are needed: the mapper has no I/O and no DB access at runtime
 * (the @workspace/db import is type-only and is erased by TypeScript).
 */
import { describe, it, expect } from "vitest";
import { dbRowToWorldState, worldStateToDbUpdate } from "../src/lib/worldStateMapper";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

type MockRow = {
  id: number;
  worldDay: number;
  worldTime: string;
  weather: string;
  currentLocationId: number;
  activeMode: string;
  isRunning: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function makeRow(overrides: Partial<MockRow> = {}): MockRow {
  return {
    id: 1,
    worldDay: 5,
    worldTime: "14:30",
    weather: "cloudy",
    currentLocationId: 3,
    activeMode: "novel",
    isRunning: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-02"),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// dbRowToWorldState
// ---------------------------------------------------------------------------

describe("dbRowToWorldState", () => {
  it("maps worldDay to globals.time.tickIndex", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ws = dbRowToWorldState(makeRow({ worldDay: 7 }) as any);
    expect(ws.globals?.time?.tickIndex).toBe(7);
  });

  it("maps worldTime to globals.time.calendarDate", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ws = dbRowToWorldState(makeRow({ worldTime: "09:00" }) as any);
    expect(ws.globals?.time?.calendarDate).toBe("09:00");
  });

  it("maps weather to globals.settings.weather", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ws = dbRowToWorldState(makeRow({ weather: "sunny" }) as any);
    expect((ws.globals?.settings as Record<string, unknown>)?.weather).toBe("sunny");
  });

  it("maps currentLocationId to globals.settings.currentLocationId", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ws = dbRowToWorldState(makeRow({ currentLocationId: 42 }) as any);
    expect((ws.globals?.settings as Record<string, unknown>)?.currentLocationId).toBe(42);
  });

  it("maps activeMode and isRunning to globals.settings", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ws = dbRowToWorldState(makeRow({ activeMode: "rpg", isRunning: false }) as any);
    const settings = ws.globals?.settings as Record<string, unknown>;
    expect(settings?.activeMode).toBe("rpg");
    expect(settings?.isRunning).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// worldStateToDbUpdate — round-trip
// ---------------------------------------------------------------------------

describe("worldStateToDbUpdate round-trip", () => {
  it("preserves all six scalar fields through dbRowToWorldState → worldStateToDbUpdate", () => {
    const row = makeRow();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ws = dbRowToWorldState(row as any);
    const update = worldStateToDbUpdate(ws);

    expect(update.worldDay).toBe(row.worldDay);
    expect(update.worldTime).toBe(row.worldTime);
    expect(update.weather).toBe(row.weather);
    expect(update.currentLocationId).toBe(row.currentLocationId);
    expect(update.activeMode).toBe(row.activeMode);
    expect(update.isRunning).toBe(row.isRunning);
  });

  it("does not include id or createdAt in the result", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update = worldStateToDbUpdate(dbRowToWorldState(makeRow() as any));
    expect("id" in update).toBe(false);
    expect("createdAt" in update).toBe(false);
  });
});
