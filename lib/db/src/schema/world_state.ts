import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const worldStateTable = pgTable("world_state", {
  id: serial("id").primaryKey(),
  worldDay: integer("world_day").notNull().default(1),
  worldTime: text("world_time").notNull().default("08:00"),
  weather: text("weather").notNull().default("clear"),
  currentLocationId: integer("current_location_id").notNull().default(1),
  activeMode: text("active_mode").notNull().default("novel"),
  isRunning: boolean("is_running").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertWorldStateSchema = createInsertSchema(worldStateTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWorldState = z.infer<typeof insertWorldStateSchema>;
export type WorldState = typeof worldStateTable.$inferSelect;
