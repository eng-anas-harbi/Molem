import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  varchar,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { z } from "zod/v4";
import { contractsTable } from "./contracts";

export type RightItem = {
  title: string;
  description: string;
  citations: string[];
};

export type AlertItem = {
  severity: "high" | "medium" | "low";
  clause: string;
  issue: string;
  affectedParty: "employee" | "employer" | "both";
  recommendation: string;
  citations: string[];
};

export type CitationItem = {
  ref: string;
  source: "law" | "regulation";
  articleNumber: string;
  title: string;
  excerpt: string;
};

export const contractAnalysesTable = pgTable(
  "contract_analyses",
  {
    id: serial("id").primaryKey(),
    contractId: integer("contract_id")
      .notNull()
      .references(() => contractsTable.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    summary: text("summary"),
    contractType: varchar("contract_type", { length: 200 }),
    partiesDescription: text("parties_description"),
    employeeRights: jsonb("employee_rights").$type<RightItem[]>(),
    employerRights: jsonb("employer_rights").$type<RightItem[]>(),
    alerts: jsonb("alerts").$type<AlertItem[]>(),
    citations: jsonb("citations").$type<CitationItem[]>(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    // Enforce at most one running analysis per contract at the DB level.
    // This partial unique index makes the check-then-insert atomic: a second
    // concurrent INSERT while another row has status='running' for the same
    // contract_id will raise a unique constraint violation (error code 23505).
    uniqueIndex("contract_analyses_one_running_idx")
      .on(table.contractId)
      .where(sql`${table.status} = 'running'`),
  ],
);

export type ContractAnalysis = typeof contractAnalysesTable.$inferSelect;
export type InsertContractAnalysis = typeof contractAnalysesTable.$inferInsert;

export const rightItemSchema: z.ZodType<RightItem> = z.object({
  title: z.string(),
  description: z.string(),
  citations: z.array(z.string()),
});

export const alertItemSchema: z.ZodType<AlertItem> = z.object({
  severity: z.enum(["high", "medium", "low"]),
  clause: z.string(),
  issue: z.string(),
  affectedParty: z.enum(["employee", "employer", "both"]),
  recommendation: z.string(),
  citations: z.array(z.string()),
});

export const citationItemSchema: z.ZodType<CitationItem> = z.object({
  ref: z.string(),
  source: z.enum(["law", "regulation"]),
  articleNumber: z.string(),
  title: z.string(),
  excerpt: z.string(),
});
