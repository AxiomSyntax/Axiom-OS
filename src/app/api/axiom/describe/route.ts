import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

interface DescribeRequestBody {
  kind: "skill" | "tool";
  name: string;
  description: string;
  instructions: string;
  longDescription?: string;
  parameters?: Array<{ name: string; type: string; description: string; required?: boolean }>;
  tags?: string[];
  endpoint?: string;
  returns?: string;
  /** Optional specific question. If omitted, the LLM produces a general overview. */
  question?: string;
}

// POST /api/axiom/describe
// Asks the LLM to describe, in plain language, what a given skill or tool
// actually does — so the user can understand it without reading the raw
// instructions. Useful when a skill's name/description is ambiguous.
export async function POST(req: NextRequest) {
  let body: DescribeRequestBody;
  try {
    body = (await req.json()) as DescribeRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.name || !body.instructions) {
    return NextResponse.json(
      { error: "name and instructions are required" },
      { status: 400 },
    );
  }

  try {
    const zai = await ZAI.create();

    const paramsBlock = body.parameters?.length
      ? "\nParameters:\n" +
        body.parameters
          .map(
            (p) =>
              `  - ${p.name} (${p.type})${p.required ? " [required]" : ""}: ${p.description}`,
          )
          .join("\n")
      : "";

    const tagsBlock = body.tags?.length
      ? `\nTags: ${body.tags.join(", ")}`
      : "";

    const endpointBlock = body.endpoint
      ? `\nEndpoint: ${body.endpoint}`
      : "";

    const returnsBlock = body.returns ? `\nReturns: ${body.returns}` : "";

    const longDescBlock = body.longDescription
      ? `\nLong description: ${body.longDescription}`
      : "";

    const userContent = `I'm looking at a ${body.kind} called "${body.name}".

Description: ${body.description}${longDescBlock}${tagsBlock}${endpointBlock}${returnsBlock}${paramsBlock}

Full instructions / documentation:
"""
${body.instructions}
"""

${body.question ? `Question: ${body.question}` : "Question: In plain, friendly language — what does this ${kind} actually do, when should I use it, and what should I be careful about? Answer in 3 short paragraphs max."}`;

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are Scribe, the memory curator of Axiom OS, asked to describe a skill or tool. " +
            "Write a clear, plain-language explanation. Use 2–3 short paragraphs. " +
            "Do NOT use headers or markdown formatting — just plain prose. " +
            "Mention concrete examples of when to use it. " +
            "Mention any caveats or anti-patterns if they're in the instructions.",
        },
        {
          role: "user",
          content: userContent.replace(/\${kind}/g, body.kind),
        },
      ],
      temperature: 0.4,
      max_tokens: 700,
    });

    const reply =
      (completion as unknown as {
        choices?: Array<{ message?: { content?: string } }>;
      }).choices?.[0]?.message?.content ?? "…";

    return NextResponse.json({
      reply,
      kind: body.kind,
      name: body.name,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Describe inference failed", detail: msg },
      { status: 500 },
    );
  }
}
