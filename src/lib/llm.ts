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

export async function generate(system: string, turns: Turn[], tools: AgentTool[]): Promise<Generation> {
  anthropic ??= new Anthropic();
  const final = await anthropic.beta.messages.toolRunner({
    model: MODEL,
    max_tokens: 4000,
    system,
    messages: turns.map((t) => ({ role: t.role, content: t.text })),
    tools: tools.map((t) => betaZodTool(t)),
    output_config: { effort: "low" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    max_iterations: MAX_STEPS,
  });
  if (final.stop_reason === "refusal") return { text: "", refused: true };
  const text = final.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
  return { text, refused: false };
}
