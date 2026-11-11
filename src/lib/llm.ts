// The model call behind the agent and translation. Claude through the Anthropic SDK
// tool runner; tools and the money guard live in agent.ts. OJA_MODEL overrides the model.

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

export type AgentTool<S extends z.ZodType = z.ZodType> = {
  name: string;
  description: string;
  inputSchema: S;
  run: (args: z.infer<S>) => Promise<string>;
};

export function tool<S extends z.ZodType>(t: AgentTool<S>): AgentTool {
  return t as unknown as AgentTool;
}

export type Turn = { role: "user" | "assistant"; text: string };
export type Generation = { text: string; refused: boolean };

const MAX_STEPS = 8;

export const MODEL = process.env.OJA_MODEL ?? "claude-opus-5-5";

let anthropic: Anthropic | null = null;

export type Usage = { steps: number; input: number; cacheRead: number; cacheWrite: number; output: number; ms: number };
/** Token and timing stats for the last call, for measuring. Never holds message text. */
export let lastUsage: Usage | null = null;

export async function generate(system: string, turns: Turn[], tools: AgentTool[]): Promise<Generation> {
  anthropic ??= new Anthropic();
  const t0 = Date.now();
  const runner = anthropic.beta.messages.toolRunner({
    model: MODEL,
    max_tokens: 4000,
    // Breakpoint on tools + system, shared by every chat with this shop.
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: turns.map((t) => ({ role: t.role, content: t.text })),
    tools: tools.map((t) => betaZodTool(t)),
    output_config: { effort: "low" },
    // And one on the latest block, so the loop's later steps reuse earlier turns.
    cache_control: { type: "ephemeral" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    max_iterations: MAX_STEPS,
  });
  const u: Usage = { steps: 0, input: 0, cacheRead: 0, cacheWrite: 0, output: 0, ms: 0 };
  let final: Anthropic.Beta.BetaMessage | null = null;
  for await (const m of runner) {
    final = m;
    u.steps++;
    u.input += m.usage.input_tokens;
    u.cacheRead += m.usage.cache_read_input_tokens ?? 0;
    u.cacheWrite += m.usage.cache_creation_input_tokens ?? 0;
    u.output += m.usage.output_tokens;
  }
  u.ms = Date.now() - t0;
  lastUsage = u;
  if (process.env.OJA_LLM_STATS === "1") console.log("[llm]", JSON.stringify(u));
  if (!final) return { text: "", refused: false };
  if (final.stop_reason === "refusal") return { text: "", refused: true };
  const text = final.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
  return { text, refused: false };
}
