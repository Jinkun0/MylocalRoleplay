import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const relationshipsTable = pgTable("relationships", {
  id: serial("id").primaryKey(),
  npcId: integer("npc_id").notNull().unique(),
  trust: integer("trust").notNull().default(0),
  respect: integer("respect").notNull().default(0),
  suspicion: integer("suspicion").notNull().default(0),
  friendship: integer("friendship").notNull().default(0),
  rivalry: integer("rivalry").notNull().default(0),
  status: text("status").notNull().default("stranger"),
  lastInteractionDay: integer("last_interaction_day"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRelationshipSchema = createInsertSchema(relationshipsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRelationship = z.infer<typeof insertRelationshipSchema>;
export type Relationship = typeof relationshipsTable.$inferSelect;
