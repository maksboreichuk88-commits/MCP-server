/**
 * Strict Zod schemas for MCP JSON-RPC transport validation.
 * Implements Progressive Disclosure and Fail-Closed parsing.
 * No `any` types. No normalization of invalid data.
 */
import { z } from "zod";

// ── Tool Color Classification (MCP Colors Paradigm) ──────────────────────
export const ToolColorSchema = z.enum(["red", "blue", "green"]).describe(
  "red = untrusted external content, blue = critical system actions, green = safe/read-only"
);

// ── Individual Tool Descriptor ───────────────────────────────────────────
export const ToolDescriptorSchema = z.object({
  name: z.string().min(1).max(128),
  arguments: z.record(z.string(), z.unknown()).optional(),
  _meta: z.object({
    color: ToolColorSchema,
    preflightId: z.string().uuid().optional(),
  }).strict(),
}).strict();

// ── JSON-RPC 2.0 Request Envelope ────────────────────────────────────────
export const JsonRpcRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  method: z.string().min(1).max(256),
  params: z.record(z.string(), z.unknown()).optional(),
}).strict();

// ── MCP tools/call specific params ───────────────────────────────────────
export const ToolsCallParamsSchema = z.object({
  name: z.string().min(1).max(128),
  arguments: z.record(z.string(), z.unknown()).optional(),
  _meta: z.object({
    color: ToolColorSchema,
    preflightId: z.string().uuid().optional(),
  }).strict().optional(),
}).strict();

// ── Auth Token Schema ────────────────────────────────────────────────────
export const AuthTokenSchema = z.string()
  .min(32, "Token too short — minimum 32 characters")
  .max(512, "Token too long — maximum 512 characters")
  .regex(/^[A-Za-z0-9\-._~+/]+=*$/, "Token contains invalid characters");

// ── Typed exports ────────────────────────────────────────────────────────
export type ToolColor = z.infer<typeof ToolColorSchema>;
export type ToolDescriptor = z.infer<typeof ToolDescriptorSchema>;
export type JsonRpcRequest = z.infer<typeof JsonRpcRequestSchema>;
export type ToolsCallParams = z.infer<typeof ToolsCallParamsSchema>;
