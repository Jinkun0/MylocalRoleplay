import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const memoryTable = pgTable("memory", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull(),
  ownerType: text("owner_type").notNull().default("world"),
  subjectId: integer("subject_id"),
  subjectName: text("subject_name"),
  content: text("content").notNull(),
  importance: text("importance").notNull().default("medium"),
  worldDay: integer("world_day").notNull().default(1),
  worldTime: text("world_time").notNull().default("08:00"),
  isLongTerm: boolean("is_long_term").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMemorySchema = createInsertSchema(memoryTable).omit({ id: true, createdAt: true });
export type InsertMemory = z.infer<typeof insertMemorySchema>;
export type Memory = typeof memoryTable.$inferSelect;
