import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ChatRequestBody {
  agentId: string;
  agentName: string;
  role: string;
  systemPrompt: string;
  messages: { role: "user" | "agent" | "system"; content: string }[];
  userMessage: string;
}

// POST /api/axiom/agent
// Streams an assistant reply from the z-ai-web-dev-sdk chat model.
export async function POST(req: NextRequest) {
  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body.userMessage || typeof body.userMessage !== "string") {
    return NextResponse.json(
      { error: "userMessage is required" },
      { status: 400 },
    );
  }

  try {
    const zai = await ZAI.create();

    // Map our role names to OpenAI-style roles.
    const history = (body.messages ?? [])
      .filter((m) => m.role !== "system" && m.content?.trim())
      .slice(-12)
      .map((m) => ({
        role: (m.role === "agent" ? "assistant" : "user") as
          | "user"
          | "assistant",
        content: m.content,
      }));

    const systemContent =
      (body.systemPrompt || "You are a helpful assistant inside Axiom OS.") +
      `\n\nYou are ${body.agentName}, role: ${body.role}. Reply in markdown. Keep responses focused.`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemContent },
        ...history,
        { role: "user", content: body.userMessage },
      ],
      temperature: 0.7,
      max_tokens: 900,
      // stream: false is the default; SDK returns a full message.
    });

    const reply =
      // SDK shape: completion.choices[0].message.content
      (completion as unknown as {
        choices?: Array<{ message?: { content?: string } }>;
      }).choices?.[0]?.message?.content ??
      "…";

    return NextResponse.json({
      reply: reply || "…",
      agentId: body.agentId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Agent inference failed", detail: msg },
      { status: 500 },
    );
  }
}
