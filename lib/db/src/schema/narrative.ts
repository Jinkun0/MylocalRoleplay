import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const narrativeTable = pgTable("narrative", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(),
  text: text("text").notNull(),
  worldDay: integer("world_day").notNull().default(1),
  worldTime: text("world_time").notNull().default("08:00"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertNarrativeSchema = createInsertSchema(narrativeTable).omit({ id: true, createdAt: true });
export type InsertNarrative = z.infer<typeof insertNarrativeSchema>;
export type Narrative = typeof narrativeTable.$inferSelect;
