import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  activeMode: text("active_mode").notNull().default("novel"),
  narrativeSpeed: text("narrative_speed").notNull().default("normal"),
  autoTickEnabled: boolean("auto_tick_enabled").notNull().default(false),
  autoTickIntervalMinutes: integer("auto_tick_interval_minutes").notNull().default(60),
  language: text("language").notNull().default("it"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
