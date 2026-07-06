import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

interface MemoryRequestBody {
  text: string;
  existingLabels?: string[];
}

// POST /api/axiom/memory
// Asks the model to extract memory-graph nodes from free text.
// Returns an array of proposed nodes (label, kind, content) and edges
// referencing existing labels by their original name.
export async function POST(req: NextRequest) {
  let body: MemoryRequestBody;
  try {
    body = (await req.json()) as MemoryRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.text?.trim()) {
    return NextResponse.json(
      { error: "text is required" },
      { status: 400 },
    );
  }

  try {
    const zai = await ZAI.create();
    const existing = (body.existingLabels ?? []).slice(0, 40);
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are Scribe, the memory curator of Axiom OS. From the user's text, extract entities worth remembering as graph nodes. " +
            "Reply with ONLY a JSON object: { \"nodes\": [{\"label\": string, \"kind\": \"concept|agent|event|artifact|code|intent|datum\", \"content\": string}], " +
            "\"edges\": [{\"source\": string, \"target\": string, \"kind\": \"relates|produces|depends-on|spawned-by|consumes|executes\"}] }. " +
            "Source and target in edges must match a label from nodes or existing labels. Max 6 nodes, 4 edges. " +
            "Existing labels you may reference: " +
            (existing.length ? existing.join(", ") : "(none)") +
            ".",
        },
        { role: "user", content: body.text },
      ],
      temperature: 0.3,
      max_tokens: 900,
    });
    const raw =
      (completion as unknown as {
        choices?: Array<{ message?: { content?: string } }>;
      }).choices?.[0]?.message?.content ?? "";

    // Extract the JSON object even if wrapped in ```json fences.
    const match = raw.match(/\{[\s\S]*\}/);
    let parsed: unknown = null;
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        parsed = null;
      }
    }
    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json({
        nodes: [],
        edges: [],
        raw,
      });
    }
    return NextResponse.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Memory inference failed", detail: msg },
      { status: 500 },
    );
  }
}
