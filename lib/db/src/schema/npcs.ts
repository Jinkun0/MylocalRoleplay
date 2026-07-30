import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const npcsTable = pgTable("npcs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  age: integer("age"),
  personality: text("personality").notNull(),
  background: text("background"),
  objectives: text("objectives").array().notNull().default([]),
  currentRoutine: text("current_routine").notNull().default("idle"),
  locationId: integer("location_id").notNull(),
  emotionalState: text("emotional_state").notNull().default("neutral"),
  knownSecrets: text("known_secrets").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertNpcSchema = createInsertSchema(npcsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertNpc = z.infer<typeof insertNpcSchema>;
export type Npc = typeof npcsTable.$inferSelect;
