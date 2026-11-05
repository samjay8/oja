// Model providers behind one interface. Tools and the money guard are shared, so
// switching provider never changes what the agent is allowed to do.
// OJA_PROVIDER=anthropic (default) | gemini. OJA_MODEL overrides the model id.

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { GoogleGenAI, ThinkingLevel, type Content, type Part } from "@google/genai";
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

export const PROVIDER = (process.env.OJA_PROVIDER ?? "anthropic") as "anthropic" | "gemini";
export const MODEL = process.env.OJA_MODEL ?? (PROVIDER === "gemini" ? "gemini-3.5-flash" : "claude-opus-5-5");

export function generate(system: string, turns: Turn[], tools: AgentTool[]): Promise<Generation> {
  return PROVIDER === "gemini" ? viaGemini(system, turns, tools) : viaAnthropic(system, turns, tools);
}

// ---- Anthropic (Claude) ----

let anthropic: Anthropic | null = null;

async function viaAnthropic(system: string, turns: Turn[], tools: AgentTool[]): Promise<Generation> {
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

// ---- Google (Gemini) ----

let gemini: GoogleGenAI | null = null;

/** Tried in order when a model is overloaded (503) or rate-limited (429). */
const GEMINI_CHAIN = [MODEL, ...(process.env.OJA_GEMINI_FALLBACKS ?? "gemini-3.7-flash,gemini-3.8-flash,gemini-3.6-flash").split(",").map((m) => m.trim()).filter(Boolean)]
  .filter((m, i, all) => all.indexOf(m) === i);

function retryable(e: unknown) {
  const status = (e as { status?: number })?.status;
  return status === 429 || status === 500 || status === 503 || status === 504 || (e instanceof Error && /timed? ?out|abort/i.test(e.message));
}

async function viaGemini(system: string, turns: Turn[], tools: AgentTool[]): Promise<Generation> {
  // Fail fast and move down the chain rather than retry one busy model for minutes.
  gemini ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: 30_000, retryOptions: { attempts: 2, initialDelay: 0.5, maxDelay: 2 } } });
  let chain = 0;
  const byName = new Map(tools.map((t) => [t.name, t]));
  const contents: Content[] = turns.map((t) => ({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: t.text }] }));
  const config = {
    systemInstruction: system,
    tools: [{
      functionDeclarations: tools.map((t) => ({
        name: t.name,
        description: t.description,
        parametersJsonSchema: z.toJSONSchema(t.inputSchema, { target: "draft-7" }),
      })),
    }],
    automaticFunctionCalling: { disable: true },
    // Chat needs speed; pricing decisions live in code, not in the model's reasoning.
    thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
  };

  for (let step = 0; step < MAX_STEPS; step++) {
    let res;
    try {
      res = await gemini.models.generateContent({ model: GEMINI_CHAIN[chain], contents, config });
    } catch (e) {
      if (!retryable(e) || chain + 1 >= GEMINI_CHAIN.length) throw e;
      console.warn(`[llm] ${GEMINI_CHAIN[chain]} unavailable, trying ${GEMINI_CHAIN[chain + 1]}`);
      chain++;
      step--;
      continue;
    }
    const candidate = res.candidates?.[0];
    if (!candidate?.content) {
      const blocked = Boolean(res.promptFeedback?.blockReason) || candidate?.finishReason === "SAFETY";
      return { text: "", refused: blocked };
    }
    // Send the model's own parts back unchanged: Gemini 3 needs its thought signatures.
    contents.push(candidate.content);
    const calls = res.functionCalls ?? [];
    if (!calls.length) {
      const text = (candidate.content.parts ?? []).filter((p) => p.text && !p.thought).map((p) => p.text).join("").trim();
      return { text, refused: false };
    }
    const results: Part[] = [];
    for (const call of calls) {
      const t = call.name ? byName.get(call.name) : undefined;
      let output: string;
      if (!t) output = `Error: unknown tool ${call.name}`;
      else {
        // The model's arguments are untrusted: validate before running.
        const parsed = t.inputSchema.safeParse(call.args ?? {});
        output = parsed.success ? await t.run(parsed.data) : `Error: invalid arguments: ${parsed.error.message}`;
      }
      results.push({ functionResponse: { id: call.id, name: call.name, response: { result: output } } });
    }
    contents.push({ role: "user", parts: results });
  }
  return { text: "", refused: false };
}
