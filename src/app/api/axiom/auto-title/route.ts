import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const runtime = "nodejs";
export const maxDuration = 30;

interface AutoTitleRequest {
  userMessage: string;
  assistantReply: string;
}

// POST /api/axiom/auto-title
// Generates a concise, descriptive title for a chat session based on the
// first user message + assistant reply. Returns a short title (2-5 words).
export async function POST(req: NextRequest) {
  let body: AutoTitleRequest;
  try {
    body = (await req.json()) as AutoTitleRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.userMessage?.trim()) {
    return NextResponse.json({ error: "userMessage is required" }, { status: 400 });
  }

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You generate concise, descriptive titles for chat conversations. " +
            "Reply with ONLY the title — no quotes, no explanation, no punctuation at the end. " +
            "The title should be 2-5 words, capturing the main topic. " +
            "Use Title Case. Examples: 'Marketing Campaign Ideas', 'Bug Fixes for Chat Overlay', 'Hermes Memory Architecture'. " +
            "Never use generic titles like 'New Chat', 'Conversation', 'Chat', 'Untitled'.",
        },
        {
          role: "user",
          content: `User asked: "${body.userMessage.slice(0, 500)}"\n\nAssistant replied: "${(body.assistantReply || "").slice(0, 500)}"\n\nGenerate a concise title for this conversation.`,
        },
      ],
      temperature: 0.3,
      max_tokens: 30,
    });

    const title =
      (completion as unknown as {
        choices?: Array<{ message?: { content?: string } }>;
      }).choices?.[0]?.message?.content?.trim() ?? "";

    const cleaned = title
      .replace(/^["'`]|["'`]$/g, "")
      .replace(/[.!?]$/, "")
      .trim()
      .slice(0, 60);

    return NextResponse.json({ title: cleaned || "New Conversation" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Auto-title generation failed", detail: msg },
      { status: 500 },
    );
  }
}
