import { pgTable, serial, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const savesTable = pgTable("saves", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  worldDay: integer("world_day").notNull().default(1),
  worldTime: text("world_time").notNull().default("08:00"),
  locationName: text("location_name").notNull().default("Unknown"),
  snapshot: jsonb("snapshot").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSaveSchema = createInsertSchema(savesTable).omit({ id: true, createdAt: true });
export type InsertSave = z.infer<typeof insertSaveSchema>;
export type Save = typeof savesTable.$inferSelect;
