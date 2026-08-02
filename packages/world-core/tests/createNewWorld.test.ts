import { describe, it, expect } from "vitest";
import { createNewWorld } from "../src/createNewWorld";
import { CURRENT_SAVE_FORMAT_VERSION, WORLD_CORE_VERSION } from "../src/createNewWorld";

describe("createNewWorld", () => {
  it("returns a WorldState with the provided name", () => {
    const world = createNewWorld({ name: "TestWorld" });
    expect(world.meta.name).toBe("TestWorld");
  });

  it("generates a non-empty worldId when none is supplied", () => {
    const world = createNewWorld({ name: "A" });
    expect(world.meta.worldId).toBeTruthy();
    expect(typeof world.meta.worldId).toBe("string");
  });

  it("respects an explicit worldId", () => {
    const id = "explicit-id-123";
    const world = createNewWorld({ name: "B", worldId: id });
    expect(world.meta.worldId).toBe(id);
  });

  it("starts at tickIndex 0", () => {
    const world = createNewWorld({ name: "C" });
    expect(world.meta.tickIndex).toBe(0);
  });

  it("stamps saveFormatVersion and worldCoreVersion correctly", () => {
    const world = createNewWorld({ name: "D" });
    expect(world.meta.saveFormatVersion).toBe(CURRENT_SAVE_FORMAT_VERSION);
    expect(world.meta.worldCoreVersion).toBe(WORLD_CORE_VERSION);
  });

  it("sets createdAt and updatedAt to ISO date strings", () => {
    const world = createNewWorld({ name: "E" });
    expect(() => new Date(world.meta.createdAt)).not.toThrow();
    expect(() => new Date(world.meta.updatedAt)).not.toThrow();
  });

  it("initialises entities and relationships as empty objects by default", () => {
    const world = createNewWorld({ name: "F" });
    expect(world.entities).toEqual({});
    expect(world.relationships).toEqual({});
  });

  it("merges optional initialState into the result", () => {
    const world = createNewWorld({ name: "G" }, { globals: { settings: { theme: "dark" } } });
    expect(world.globals?.settings?.theme).toBe("dark");
  });

  it("two worlds created without explicit IDs get different worldIds", () => {
    const w1 = createNewWorld({ name: "H1" });
    const w2 = createNewWorld({ name: "H2" });
    expect(w1.meta.worldId).not.toBe(w2.meta.worldId);
  });
});
