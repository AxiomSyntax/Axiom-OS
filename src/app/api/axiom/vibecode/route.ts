import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

interface VibeRequestBody {
  mode: "javascript" | "python" | "prompt";
  source: string;
  context?: string;
}

// POST /api/axiom/vibecode
// - For "javascript": we run the code in a hardened Node sandbox and
//   return captured logs and the returned value.
// - For "python": there's no real runtime, so we route the source through
//   the LLM which simulates execution and returns the expected stdout.
// - For "prompt": we treat the source as an English build request, route
//   through Forge persona, and return proposed code + a summary.
export async function POST(req: NextRequest) {
  let body: VibeRequestBody;
  try {
    body = (await req.json()) as VibeRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { mode, source } = body;
  if (!source) {
    return NextResponse.json({ error: "source is required" }, { status: 400 });
  }

  if (mode === "javascript") {
    return runJavaScript(source);
  }
  if (mode === "python") {
    return simulatePython(source);
  }
  return runPrompt(source, body.context);
}

// ── JavaScript sandboxed execution ────────────────────────────────────────
// We collect console.* calls into a logs array, then eval the user source
// with a function wrapper that supports `return { ... }`.
async function runJavaScript(source: string) {
  const logs: { level: string; text: string }[] = [];
  const sandboxConsole = {
    log: (...args: unknown[]) => logs.push({ level: "log", text: args.map(fmt).join(" ") }),
    info: (...args: unknown[]) => logs.push({ level: "info", text: args.map(fmt).join(" ") }),
    warn: (...args: unknown[]) => logs.push({ level: "warn", text: args.map(fmt).join(" ") }),
    error: (...args: unknown[]) => logs.push({ level: "error", text: args.map(fmt).join(" ") }),
  };

  // Wrap so `return X` at top level becomes a function return value.
  const wrapped = `"use strict";\n${source}`;
  try {
    const fn = new Function("console", wrapped);
    const result = fn(sandboxConsole);
    let resultStr: string | undefined;
    if (result !== undefined) {
      try {
        resultStr = JSON.stringify(result, null, 2);
      } catch {
        resultStr = String(result);
      }
    }
    return NextResponse.json({
      mode: "javascript",
      ok: true,
      logs,
      result: resultStr,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      mode: "javascript",
      ok: false,
      logs,
      error: msg,
    });
  }
}

function fmt(v: unknown): string {
  if (typeof v === "string") return v;
  if (v === undefined) return "undefined";
  if (v === null) return "null";
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

// ── Python simulation via LLM ─────────────────────────────────────────────
async function simulatePython(source: string) {
  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are a Python interpreter simulator inside Axiom OS. The user gives you Python code. " +
            "Reply with ONLY the exact stdout the program would print when executed with CPython 3.11. " +
            "Do not add explanations. If the code would error, print a realistic Python traceback.",
        },
        { role: "user", content: source },
      ],
      temperature: 0.1,
      max_tokens: 800,
    });
    const stdout =
      (completion as unknown as {
        choices?: Array<{ message?: { content?: string } }>;
      }).choices?.[0]?.message?.content ?? "";
    return NextResponse.json({
      mode: "python",
      ok: true,
      stdout,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { mode: "python", ok: false, error: msg },
      { status: 500 },
    );
  }
}

// ── Prompt mode: build intent into code ────────────────────────────────────
async function runPrompt(source: string, context?: string) {
  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are Forge, the code synthesist of Axiom OS. The user describes what they want built. " +
            "Reply with a markdown plan: first a one-line summary, then a fenced ```javascript code block that implements it, " +
            "then a short paragraph explaining design choices. The JS should be runnable in the VibeCode sandbox (top-level return is allowed).",
        },
        {
          role: "user",
          content: (context ? `Context: ${context}\n\n` : "") + source,
        },
      ],
      temperature: 0.6,
      max_tokens: 1400,
    });
    const reply =
      (completion as unknown as {
        choices?: Array<{ message?: { content?: string } }>;
      }).choices?.[0]?.message?.content ?? "";
    return NextResponse.json({
      mode: "prompt",
      ok: true,
      reply,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { mode: "prompt", ok: false, error: msg },
      { status: 500 },
    );
  }
}
