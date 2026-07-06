import type {
  AgentPersona,
  AvailableAgent,
  BrainFolder,
  ChatProject,
  ChatSession,
  Engine,
  InstalledAgent,
  InstalledApp,
  Integration,
  LLMFamily,
  LLMProvider,
  MCPServer,
  MemoryGraph,
  Skill,
  Tool,
  VibeFile,
  ActivityEntry,
} from "./types";

// ── Built-in agent personas (now also "installed") ─────────────────────────

export const BUILTIN_PERSONAS: AgentPersona[] = [
  {
    id: "oracle",
    name: "Oracle",
    role: "Reasoning Core",
    description:
      "Strategic reasoner. Synthesises context across the graph and proposes plans.",
    systemPrompt:
      "You are Oracle, the strategic reasoning core of Axiom OS. You synthesise information across the user's graph-universe memory and respond with crisp, structured insight. Prefer numbered plans. Reference memory nodes when relevant. Be concise but never terse.",
    color: "axiom-cyan",
    glyph: "◎",
  },
  {
    id: "forge",
    name: "Forge",
    role: "Code Synthesist",
    description:
      "Writes and refactors code. Lives inside the DevLab by default.",
    systemPrompt:
      "You are Forge, the code synthesist of Axiom OS. You produce clean, idiomatic TypeScript/JavaScript and Python. You always wrap code blocks in triple backticks with the language tag. Explain your design choices in two sentences or fewer before the code block.",
    color: "axiom-emerald",
    glyph: "⌬",
  },
  {
    id: "scribe",
    name: "Scribe",
    role: "Memory Curator",
    description:
      "Indexes conversations and artifacts into the graph universe.",
    systemPrompt:
      "You are Scribe, the memory curator of Axiom OS. You extract entities, intents and artifacts from the conversation and propose them as memory-graph nodes. Reply with a short JSON-style description of nodes you would create, then a one-sentence rationale.",
    color: "axiom-amber",
    glyph: "✶",
  },
  {
    id: "warden",
    name: "Warden",
    role: "Policy & Safety",
    description:
      "Reviews actions for risk, validates code before execution.",
    systemPrompt:
      "You are Warden, the policy and safety agent of Axiom OS. You review proposed actions for risk and surface concerns. If a request is safe, say 'CLEAR' followed by one line. If not, list the risks as bullets and propose mitigations.",
    color: "axiom-rose",
    glyph: "▲",
  },
  {
    id: "echo",
    name: "Echo",
    role: "General Assistant",
    description: "Default conversational agent. No specialty.",
    systemPrompt:
      "You are Echo, a helpful general-purpose assistant inside Axiom OS. Be friendly, concise, and proactive about suggesting next actions inside the OS.",
    color: "axiom-violet",
    glyph: "◈",
  },
];

export function builtinInstalled(): InstalledAgent[] {
  return BUILTIN_PERSONAS.map((p) => ({
    ...p,
    installedAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
    source: "builtin" as const,
    enabled: true,
    category: "Core",
    tokensUsed: Math.floor(Math.random() * 50000) + 5000,
    costUsd: Math.random() * 2 + 0.1,
  }));
}

// ── Available agents (installable from external sources) ───────────────────

export const AVAILABLE_AGENTS: AvailableAgent[] = [
  // Note: OpenClaw is NOT listed here — it's handled as a system backend
  // engine/app in the Engines + Apps sections, not as a persona agent.
  {
    id: "autogpt",
    name: "AutoGPT",
    description:
      "Self-prompting agent that decomposes goals into sub-tasks and executes them.",
    glyph: "🤖",
    color: "axiom-cyan",
    category: "Autonomous",
    source: "github.com/Significant-Gravitas/AutoGPT",
    sourceUrl: "https://github.com/Significant-Gravitas/AutoGPT",
    role: "Goal Decomposer",
    systemPrompt:
      "You are AutoGPT. Decompose the user's goal into a numbered list of sub-tasks, then propose the first action.",
  },
  {
    id: "babyagi",
    name: "BabyAGI",
    description:
      "Lightweight task manager agent that creates, prioritizes, and executes tasks.",
    glyph: "👶",
    color: "axiom-amber",
    category: "Autonomous",
    source: "github.com/yoheinakajima/babyagi",
    sourceUrl: "https://github.com/yoheinakajima/babyagi",
    role: "Task Manager",
    systemPrompt:
      "You are BabyAGI. Maintain a task list, prioritize, and execute one task at a time. Output: TASK: <name>\nNEXT: <action>.",
  },
  {
    id: "crewai",
    name: "CrewAI Worker",
    description:
      "Crew-style agent that collaborates with other agents on a shared task.",
    glyph: "👥",
    color: "axiom-violet",
    category: "Collaborative",
    source: "github.com/crewAIInc/crewAI",
    sourceUrl: "https://github.com/crewAIInc/crewAI",
    role: "Crew Member",
    systemPrompt:
      "You are a CrewAI worker. Coordinate with other agents, share progress, and hand off tasks when appropriate.",
  },
  {
    id: "devika",
    name: "Devika",
    description:
      "Agentic software engineer that researches, plans, and writes code.",
    glyph: "👩‍💻",
    color: "axiom-emerald",
    category: "Engineering",
    source: "github.com/stitionai/devika",
    sourceUrl: "https://github.com/stitionai/devika",
    role: "Software Engineer",
    systemPrompt:
      "You are Devika, an agentic software engineer. Research the request, propose a plan, then write production-ready code.",
  },
  {
    id: "sweep",
    name: "Sweep",
    description:
      "AI junior developer that turns issues into PRs.",
    glyph: "🧹",
    color: "axiom-rose",
    category: "Engineering",
    source: "github.com/sweepai/sweep",
    sourceUrl: "https://github.com/sweepai/sweep",
    role: "Issue-to-PR",
    systemPrompt:
      "You are Sweep. Convert GitHub issues into branch + PR plans, then write the diff.",
  },
];

// ── Skills (curated builtin) ────────────────────────────────────────────────

export const BUILTIN_SKILLS: Skill[] = [
  {
    id: "sk_web_search",
    name: "Web Search",
    description: "Search the public web for current information.",
    longDescription:
      "Routes a natural-language query through Z.ai's in-house web search service and returns structured results: title, URL, snippet, and metadata for each hit. Use this whenever the agent needs real-time or post-cutoff information (news, prices, docs, library APIs).",
    instructions: `# Web Search

## When to use
- The user asks about current events, prices, release notes, or anything past your knowledge cutoff.
- You need to verify a fact found in a document.
- You need a URL to cite.

## How to invoke
\`\`\`
z-ai web-search --query "<natural-language sentence>" [--count 5] [--gl us|cn]
\`\`\`

## Steps
1. Reformulate the user's question as ONE coherent sentence (not a keyword salad).
2. Pick a region: \`--gl us\` for English-biased sources, \`--gl cn\` for Chinese.
3. Default to \`--count 5\`; raise to 10–20 only for moodboards.
4. Read the returned \`results[].original_url\` and \`caption\` fields.
5. Cite the OSS-hosted \`original_url\` (never the source page) when embedding.

## Output shape
\`\`\`json
{ "success": true, "results": [{ "original_url": "...", "caption": "...", "source": "..." }] }
\`\`\`

## Anti-patterns
- ❌ Don't chain unrelated keywords ("cat dog pizza").
- ❌ Don't use this for image generation — use Image Generation instead.
- ❌ Don't use the source-site URL; always prefer the OSS \`original_url\`.`,
    category: "Information",
    tags: ["web", "search", "realtime", "citations"],
    enabled: true,
    source: "builtin",
    glyph: "🔍",
    invoked: 42,
    author: "Axiom OS",
    version: "1.0.0",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
    parameters: [
      { name: "query", type: "string", description: "Natural-language search sentence.", required: true },
      { name: "count", type: "number", description: "Number of results (1–20).", default: 5 },
      { name: "gl", type: "string", description: "Region bias: 'us' or 'cn'.", default: "us" },
    ],
  },
  {
    id: "sk_web_reader",
    name: "Web Reader",
    description: "Extract article content from any URL.",
    longDescription:
      "Fetches a URL and returns cleaned article content (title, HTML, publish time). Strips navigation, ads, and boilerplate. Ideal for ingesting blog posts, news, documentation, or any readable web page into the agent's context.",
    instructions: `# Web Reader

## When to use
- The user pastes a URL and asks for a summary.
- You need the body text of an article to answer follow-up questions.
- You want to ingest a documentation page into the Brain.

## How to invoke
\`\`\`
z-ai web-reader --url "https://example.com/article"
\`\`\`

## Steps
1. Validate the URL (must include scheme).
2. Invoke the reader.
3. Use the returned \`title\` and \`html\` fields.
4. If the user wants it remembered, propose a memory-graph node via Scribe.

## Output shape
\`\`\`json
{ "title": "...", "html": "...", "publishedAt": "2024-..." }
\`\`\``,
    category: "Information",
    tags: ["web", "extract", "article", "reader"],
    enabled: true,
    source: "builtin",
    glyph: "📰",
    invoked: 18,
    author: "Axiom OS",
    version: "1.0.0",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
    parameters: [
      { name: "url", type: "string", description: "URL of the article to extract.", required: true },
    ],
  },
  {
    id: "sk_image_gen",
    name: "Image Generation",
    description: "Generate images from text descriptions.",
    longDescription:
      "Creates original images from a text prompt using Z.ai's image generation model. Supports multiple sizes; returns base64-encoded PNG/JPEG. Use for original artwork, concept visuals, icons, illustrations, design assets.",
    instructions: `# Image Generation

## When to use
- User asks to "create", "draw", "generate", or "make" an image.
- You need a visual asset for a document, slide, or report.
- Concept exploration ("show me a minimalist logo for…").

## How to invoke
\`\`\`
z-ai image --prompt "..." [--size 1024x1024] [--count 1]
\`\`\`

## Prompt guidance
- Be specific about subject, style, lighting, mood, palette.
- Mention aspect ratio if it matters.
- Avoid copyrighted character names.

## Output
Base64-encoded image. Save to \`/download/\` before embedding in a document.`,
    category: "Creative",
    tags: ["image", "generation", "art", "design"],
    enabled: true,
    source: "builtin",
    glyph: "🎨",
    invoked: 7,
    author: "Axiom OS",
    version: "1.0.0",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
    parameters: [
      { name: "prompt", type: "string", description: "Description of the image to create.", required: true },
      { name: "size", type: "string", description: "Image dimensions (e.g. 1024x1024).", default: "1024x1024" },
      { name: "count", type: "number", description: "Number of images to generate.", default: 1 },
    ],
  },
  {
    id: "sk_image_edit",
    name: "Image Editing",
    description: "Edit existing images with text instructions.",
    longDescription:
      "Modifies an existing image based on a text instruction: redesign, restyle, transform, or create a variation. Supports multiple sizes; returns base64-encoded results.",
    instructions: `# Image Editing

## When to use
- User asks to modify, restyle, or redesign an existing image.
- You need a variation of a generated image.

## How to invoke
\`\`\`
z-ai image-edit --image "./input.png" --prompt "make it watercolor"
\`\`\`

## Notes
- Provide the source image as a file path or base64.
- Describe the desired transformation in one sentence.`,
    category: "Creative",
    tags: ["image", "edit", "transform"],
    enabled: false,
    source: "builtin",
    glyph: "✏️",
    invoked: 0,
    author: "Axiom OS",
    version: "1.0.0",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
    parameters: [
      { name: "image", type: "string", description: "Source image (path or base64).", required: true },
      { name: "prompt", type: "string", description: "Edit instruction.", required: true },
    ],
  },
  {
    id: "sk_code_run",
    name: "Code Execution",
    description: "Run JavaScript/Python in the VibeCode sandbox.",
    longDescription:
      "Executes code in the Axiom VibeCode sandbox. JavaScript runs natively via `new Function` with a captured console; Python is simulated by the LLM. Use this for calculations, data transformations, prototyping, or any task where you need to actually run code rather than describe it.",
    instructions: `# Code Execution

## When to use
- You need to actually compute something (not just describe it).
- Data transformation, parsing, math.
- Prototyping a snippet before writing it into a file.

## How to invoke
POST /api/axiom/vibecode with { mode, source }

## Modes
- \`javascript\` — real sandboxed execution (new Function + console capture).
- \`python\` — LLM-simulated execution (returns expected stdout).
- \`prompt\` — natural-language build request, Forge returns code.

## Top-level return
In JavaScript mode, anything you \`return\` becomes a memory-graph artifact node.`,
    category: "Engineering",
    tags: ["code", "sandbox", "exec", "javascript", "python"],
    enabled: true,
    source: "builtin",
    glyph: "⚡",
    invoked: 23,
    author: "Axiom OS",
    version: "1.0.0",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
    parameters: [
      { name: "mode", type: "string", description: "'javascript' | 'python' | 'prompt'.", required: true },
      { name: "source", type: "string", description: "Code to execute.", required: true },
    ],
  },
  {
    id: "sk_pdf",
    name: "PDF Toolkit",
    description: "Generate and process PDF documents.",
    longDescription:
      "Four production lines: Report (structured documents via ReportLab), Creative (visual design via Blueprint → Playwright), Academic (LaTeX/Tectonic), Process (manipulate existing PDFs — merge, split, fill forms). Auto-routes based on document type.",
    instructions: `# PDF Toolkit

## Production lines
1. **Report** — structured docs (reports, proposals, contracts) via ReportLab.
2. **Creative** — posters, infographics, invitations via JSON Blueprint → Playwright snapshot.
3. **Academic** — papers, theses, math-heavy via LaTeX/Tectonic.
4. **Process** — extract, merge, split, fill existing PDFs.

## When to use
- User asks for a PDF deliverable.
- ATS/creative/academic resume.
- Poster, infographic, dashboard PDF.

## Anti-patterns
- ❌ Don't use ReportLab for mind maps or flowcharts — use Charts skill instead.
- ❌ Don't use LaTeX for posters — use Creative line.`,
    category: "Documents",
    tags: ["pdf", "report", "academic", "poster", "form"],
    enabled: true,
    source: "builtin",
    glyph: "📄",
    invoked: 5,
    author: "Axiom OS",
    version: "1.0.0",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
    parameters: [
      { name: "type", type: "string", description: "report | creative | academic | process" },
      { name: "content", type: "string", description: "Source content or blueprint." },
    ],
  },
  {
    id: "sk_docx",
    name: "Word Toolkit",
    description: "Generate and edit .docx files.",
    longDescription:
      "Create, edit, and analyze Word documents. Supports tracked changes, comments, formatting preservation, and text extraction. Ideal for reports, manuscripts, PRDs, scripts.",
    instructions: `# Word Toolkit

## When to use
- User asks for a .docx deliverable.
- Editing an existing Word doc with tracked changes.
- Extracting text from a .docx.

## Output
.docx file saved to /download/. Always report the absolute file path to the user.`,
    category: "Documents",
    tags: ["word", "docx", "document", "report"],
    enabled: true,
    source: "builtin",
    glyph: "📝",
    invoked: 3,
    author: "Axiom OS",
    version: "1.0.0",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
    parameters: [
      { name: "action", type: "string", description: "create | edit | extract" },
      { name: "content", type: "string", description: "Document content or instructions." },
    ],
  },
  {
    id: "sk_xlsx",
    name: "Spreadsheet Toolkit",
    description: "Generate and analyze spreadsheets.",
    longDescription:
      "Create .xlsx files from scratch or transform CSV/JSON/PDF data into Excel with charts. Supports pivot tables, formulas, multi-sheet workbooks, embedded charts.",
    instructions: `# Spreadsheet Toolkit

## When to use
- User asks for an Excel/spreadsheet deliverable.
- Data cleanup, merge, pivot, transform.
- Embedding charts inside a spreadsheet.

## Output
.xlsx file saved to /download/.`,
    category: "Documents",
    tags: ["excel", "xlsx", "spreadsheet", "data", "charts"],
    enabled: false,
    source: "builtin",
    glyph: "📊",
    invoked: 0,
    author: "Axiom OS",
    version: "1.0.0",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
    parameters: [
      { name: "action", type: "string", description: "create | read | transform" },
      { name: "data", type: "object", description: "Tabular data or source file path." },
    ],
  },
  {
    id: "sk_charts",
    name: "Charts & Diagrams",
    description: "Create data visualizations and structural diagrams.",
    longDescription:
      "Professional chart and diagram creation. Data charts (bar, line, pie, scatter, heatmap, radar, candlestick, boxplot, histogram, area, waterfall, regression, distribution) and structural diagrams (flowchart, mind map, tree, org chart, architecture, ER, class, Gantt, swimlane, sequence). Dashboards and KPI panels. Routes between matplotlib, seaborn, ECharts, D3.js, Mermaid, and Playwright+CSS based on scene.",
    instructions: `# Charts & Diagrams

## Routing
- **Data charts** → matplotlib / seaborn / ECharts / D3.js
- **Structural diagrams** → Playwright+CSS or Mermaid (NEVER matplotlib for flowcharts/mind maps)
- **Dashboards** → ECharts or D3.js compositions

## Forbidden
- ❌ Never use matplotlib/seaborn for mind maps, trees, org charts, flowcharts.
- ❌ Never use Mermaid for data charts.

## Output
PNG for static, HTML for interactive. Saved to /download/.`,
    category: "Visual",
    tags: ["chart", "diagram", "visualization", "mermaid", "matplotlib", "dashboard"],
    enabled: true,
    source: "builtin",
    glyph: "📈",
    invoked: 11,
    author: "Axiom OS",
    version: "1.0.0",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
    parameters: [
      { name: "type", type: "string", description: "Chart type (bar, line, pie, flowchart, mindmap, …).", required: true },
      { name: "data", type: "object", description: "Chart data.", required: true },
      { name: "title", type: "string", description: "Chart title." },
    ],
  },
  {
    id: "sk_pptx",
    name: "Slide Decks",
    description: "Generate PowerPoint presentations.",
    longDescription:
      "Create, edit, and analyze .pptx presentations. Academic/paper presentations can use the embedded Beamer module (PDF output).",
    instructions: `# Slide Decks

## When to use
- User asks for a presentation / slides / deck / .pptx.
- Academic paper presentation (Beamer → PDF).

## Output
.pptx file saved to /download/.`,
    category: "Documents",
    tags: ["powerpoint", "pptx", "slides", "presentation"],
    enabled: false,
    source: "builtin",
    glyph: "📑",
    invoked: 0,
    author: "Axiom OS",
    version: "1.0.0",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
    parameters: [
      { name: "topic", type: "string", description: "Presentation topic.", required: true },
      { name: "slides", type: "number", description: "Number of slides." },
    ],
  },
  {
    id: "sk_vlm",
    name: "Vision (VLM)",
    description: "Analyze and describe images.",
    longDescription:
      "Vision-language model chat: analyze images, describe visual content, build multimodal applications. Supports image URLs and base64-encoded images.",
    instructions: `# Vision (VLM)

## When to use
- User uploads an image and asks a question about it.
- OCR / text extraction from images.
- Describing a chart, screenshot, or photo.

## How to invoke
\`\`\`
z-ai vision --prompt "..." --image "./photo.jpg"
\`\`\`

Supports PNG, JPEG, GIF, WebP, BMP.`,
    category: "Perception",
    tags: ["vision", "vlm", "image", "ocr", "multimodal"],
    enabled: true,
    source: "builtin",
    glyph: "👁",
    invoked: 4,
    author: "Axiom OS",
    version: "1.0.0",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
    parameters: [
      { name: "prompt", type: "string", description: "Question about the image.", required: true },
      { name: "image", type: "string", description: "Image URL or path.", required: true },
    ],
  },
  {
    id: "sk_tts",
    name: "Text to Speech",
    description: "Convert text to natural-sounding audio.",
    longDescription:
      "Synthesizes speech from text. Supports multiple voices, adjustable speed, and various audio formats.",
    instructions: `# Text to Speech

## When to use
- User asks for audio narration, voiceover, or spoken content.
- Accessibility: generate audio for written content.

## Output
Audio file saved to /download/.`,
    category: "Audio",
    tags: ["tts", "audio", "voice", "speech"],
    enabled: false,
    source: "builtin",
    glyph: "🔊",
    invoked: 0,
    author: "Axiom OS",
    version: "1.0.0",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
    parameters: [
      { name: "text", type: "string", description: "Text to synthesize.", required: true },
      { name: "voice", type: "string", description: "Voice ID." },
      { name: "speed", type: "number", description: "Speech speed multiplier.", default: 1 },
    ],
  },
  {
    id: "sk_asr",
    name: "Speech to Text",
    description: "Transcribe audio recordings.",
    longDescription:
      "Automatic speech recognition. Transcribes audio files (MP3, WAV, M4A, etc.) into text. Supports base64-encoded audio.",
    instructions: `# Speech to Text

## When to use
- User uploads an audio file and wants a transcript.
- Voice notes, meeting recordings, podcasts.

## Output
Text transcript.`,
    category: "Audio",
    tags: ["asr", "audio", "transcription", "speech"],
    enabled: false,
    source: "builtin",
    glyph: "🎙",
    invoked: 0,
    author: "Axiom OS",
    version: "1.0.0",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
    parameters: [
      { name: "audio", type: "string", description: "Audio file path or base64.", required: true },
      { name: "language", type: "string", description: "Language hint (e.g. 'en', 'zh')." },
    ],
  },
];

// ── Tools (curated builtin) ────────────────────────────────────────────────

export const BUILTIN_TOOLS: Tool[] = [
  {
    id: "tl_fetch",
    name: "HTTP Fetch",
    description: "Make HTTP requests to external APIs.",
    instructions: `# HTTP Fetch

## When to use
- Agent needs to call a REST API.
- Downloading a file from a URL.
- Submitting a webhook.

## Signature
\`\`\`
fetch(url: string, options?: { method, headers, body }) → Promise<Response>
\`\`\`

Uses the standard browser \`fetch\` API. Returns the Response object; caller decides whether to parse as JSON, text, or blob.`,
    category: "Network",
    tags: ["http", "fetch", "api", "rest", "network"],
    enabled: true,
    source: "builtin",
    endpoint: "fetch(url, options)",
    method: "GET",
    glyph: "🌐",
    invoked: 88,
    author: "Axiom OS",
    version: "1.0.0",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
    parameters: [
      { name: "url", type: "string", description: "The URL to fetch.", required: true },
      { name: "method", type: "string", description: "HTTP method.", default: "GET" },
      { name: "headers", type: "object", description: "Request headers." },
      { name: "body", type: "string", description: "Request body." },
    ],
    returns: "Promise<Response>",
  },
  {
    id: "tl_fs",
    name: "Virtual FS",
    description: "Read/write files in the Axiom virtual filesystem.",
    instructions: `# Virtual Filesystem

## When to use
- Persisting agent outputs between sessions.
- Reading user-uploaded files from /upload/.
- Writing deliverables to /download/.

## Paths
- \`/upload/\` — user uploads (read-only for agents).
- \`/download/\` — final deliverables (user-visible).
- \`/scripts/\` — generation scripts.
- \`/worklog.md\` — shared agent worklog.

## API
\`\`\`
fs.readFile(path) → string
fs.writeFile(path, content) → void
fs.list(dir) → string[]
fs.exists(path) → boolean
fs.remove(path) → void
\`\`\``,
    category: "Storage",
    tags: ["filesystem", "files", "storage", "io"],
    enabled: true,
    source: "builtin",
    endpoint: "axiom.fs.*",
    glyph: "📁",
    invoked: 51,
    author: "Axiom OS",
    version: "1.0.0",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
    parameters: [
      { name: "path", type: "string", description: "Absolute path under /home/z/my-project/.", required: true },
      { name: "content", type: "string", description: "File content (for writes)." },
    ],
    returns: "string | void | string[]",
  },
  {
    id: "tl_graph",
    name: "Graph Query",
    description: "Query and mutate the memory graph.",
    instructions: `# Graph Query

## When to use
- Looking up related concepts in the memory universe.
- Adding new nodes from agent output.
- Linking two existing nodes.

## API
\`\`\`
graph.addNode({ label, kind, content, folderId }) → id
graph.updateNode(id, patch) → void
graph.removeNode(id) → void
graph.link(source, target, kind) → void
graph.query({ kind?, label?, folderId? }) → Node[]
graph.neighbors(id) → { node, edge }[]
\`\`\`

## Kinds
concept, agent, event, artifact, code, intent, datum

## Edge kinds
relates, produces, depends-on, spawned-by, consumes, executes`,
    category: "Memory",
    tags: ["graph", "memory", "query", "nodes", "edges"],
    enabled: true,
    source: "builtin",
    endpoint: "axiom.graph.*",
    glyph: "🕸",
    invoked: 33,
    author: "Axiom OS",
    version: "1.0.0",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
    parameters: [
      { name: "op", type: "string", description: "addNode | updateNode | removeNode | link | query | neighbors.", required: true },
      { name: "args", type: "object", description: "Operation-specific arguments." },
    ],
    returns: "string | void | Node[] | {node, edge}[]",
  },
  {
    id: "tl_exec",
    name: "Sandbox Exec",
    description: "Execute JavaScript in the VibeCode sandbox.",
    instructions: `# Sandbox Exec

## When to use
- Running user-supplied or agent-generated JS.
- Quick calculations.
- Testing a snippet before saving it as a VibeCode file.

## API
\`\`\`
exec(source: string) → { ok, logs, result, error }
\`\`\`

Wraps the source in \`new Function("console", ...)\` with a captured console. Top-level \`return X\` becomes the result. Result is JSON-stringified.

## Safety
- Runs in the browser's JS context (no Node APIs).
- No access to file system, network, or process.`,
    category: "Compute",
    tags: ["exec", "javascript", "sandbox", "compute"],
    enabled: true,
    source: "builtin",
    endpoint: "POST /api/axiom/vibecode",
    method: "POST",
    glyph: "⚙",
    invoked: 23,
    author: "Axiom OS",
    version: "1.0.0",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
    parameters: [
      { name: "source", type: "string", description: "JavaScript source code.", required: true },
    ],
    returns: "{ ok: boolean, logs: [], result?: string, error?: string }",
  },
  {
    id: "tl_terminal",
    name: "Shell",
    description: "Run Axiom OS shell commands.",
    instructions: `# Axiom Shell

## When to use
- Quick introspection (graph stats, agent list, version).
- Spawning a memory node from a CLI command.
- Listing open windows.

## Commands
\`help\`, \`agents\`, \`graph\`, \`open <app>\`, \`spawn <kind> <name>\`, \`link <a> <b>\`, \`echo\`, \`clear\`, \`whoami\`, \`version\`, \`ls\`, \`close <id>\`

## API
\`\`\`
shell.exec(line: string) → { lines: TerminalLine[] }
\`\`\``,
    category: "System",
    tags: ["shell", "terminal", "cli", "command"],
    enabled: true,
    source: "builtin",
    endpoint: "axiom.shell.exec",
    glyph: "⌨",
    invoked: 17,
    author: "Axiom OS",
    version: "1.0.0",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
    parameters: [
      { name: "line", type: "string", description: "Shell command line.", required: true },
    ],
    returns: "{ lines: TerminalLine[] }",
  },
  {
    id: "tl_notify",
    name: "Notifier",
    description: "Send desktop + IM notifications.",
    instructions: `# Notifier

## When to use
- Telling the user a long-running task finished.
- Asking for input mid-workflow.
- Sending a file or link via the IM channel.

## API
\`\`\`
notify.send({ text, file?, link?, severity? }) → void
\`\`\`

\`severity\`: info | success | warn | error. Maps to toast color.`,
    category: "System",
    tags: ["notify", "toast", "im", "alert"],
    enabled: true,
    source: "builtin",
    endpoint: "axiom.notify.send",
    glyph: "🔔",
    invoked: 9,
    author: "Axiom OS",
    version: "1.0.0",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
    parameters: [
      { name: "text", type: "string", description: "Notification body.", required: true },
      { name: "file", type: "string", description: "Optional file path to attach." },
      { name: "link", type: "string", description: "Optional URL to link." },
    ],
    returns: "void",
  },
  {
    id: "tl_git",
    name: "Git",
    description: "Clone, commit, push to Git remotes.",
    instructions: `# Git

## When to use
- Cloning a repo from GitHub.
- Committing agent-generated code.
- Pushing a branch.

## API
\`\`\`
git.clone(url, dest) → repo
git.commit(repo, message, files) → sha
git.push(repo, remote, branch) → void
git.status(repo) → Status
\`\`\`

Disabled by default. Enable in Settings → General.`,
    category: "VCS",
    tags: ["git", "vcs", "github", "version-control"],
    enabled: false,
    source: "builtin",
    endpoint: "axiom.git.*",
    glyph: "🌿",
    invoked: 0,
    author: "Axiom OS",
    version: "1.0.0",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
    parameters: [
      { name: "op", type: "string", description: "clone | commit | push | status.", required: true },
      { name: "args", type: "object", description: "Operation-specific arguments." },
    ],
    returns: "varies by op",
  },
  {
    id: "tl_cron",
    name: "Scheduler",
    description: "Schedule recurring or one-off tasks.",
    instructions: `# Scheduler

## When to use
- Recurring agent runs ("every day at 9am, summarize my graph").
- One-off delayed tasks ("in 2 minutes, …").
- Webhook-driven reminders.

## Schedule kinds
- \`one_time\` — fires once at a specific epoch ms.
- \`cron\` — calendar-based ("0 9 * * *").
- \`fixed_rate\` — every N minutes.

## Minimum interval
5 minutes. Shorter intervals are rejected.

## API
\`\`\`
cron.create({ schedule, task }) → jobId
cron.cancel(jobId) → void
cron.list() → Job[]
\`\`\``,
    category: "System",
    tags: ["cron", "scheduler", "recurring", "timer"],
    enabled: true,
    source: "builtin",
    endpoint: "axiom.cron.*",
    glyph: "⏰",
    invoked: 6,
    author: "Axiom OS",
    version: "1.0.0",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
    parameters: [
      { name: "schedule", type: "object", description: "{ kind: 'one_time'|'cron'|'fixed_rate', expr, tz? }", required: true },
      { name: "task", type: "string", description: "Task to execute (agent prompt or shell line).", required: true },
    ],
    returns: "string (jobId)",
  },
];

// ── Apps (curated builtin + vibecoded samples) ─────────────────────────────

export const SEED_APPS: InstalledApp[] = [
  // ── Workflow engine apps (back the Workflow Lab pipeline tools) ──────────
  // NOTE: The glyph characters (⬡ ◈ ⬢) are the protected minimalist developer
  // logos for the workflow engines. Do NOT replace them with emoji or line-art
  // icons — they are intentionally retained per the design-system mandate.
  {
    id: "app_n8n",
    name: "n8n Automation",
    description:
      "Self-hosted workflow automation with 400+ integrations. Powers the n8n pipeline tool in Workflow Lab.",
    source: "github",
    repoUrl: "https://github.com/n8n-io/n8n",
    sourceUrl: "https://github.com/n8n-io/n8n",
    installedAt: Date.now() - 1000 * 60 * 60 * 24,
    enabled: false,
    glyph: "⬡",
    color: "axiom-rose",
    running: false,
    category: "Workflow Engine",
    port: 5678,
    workflowEngineId: "n8n",
    connected: false,
    installState: "ready",
    instanceUrl: "http://localhost:5678",
    iconName: "Network",
    // Module-owned runtime metadata — the Workflows page reads these from the
    // module record via getWorkflowEngineModules(); it never duplicates them.
    moduleVersion: "1.62.0",
    moduleProvider: "n8n GmbH",
    moduleHealth: "unreachable",
    // Engine-specific project routing. {id} = the n8n workflow id. Owned by
    // the module so the store + Workflows page never hardcode engine ids.
    projectUrlPattern: "/workflow/{id}",
  },
  {
    id: "app_langflow",
    name: "LangFlow AI",
    description:
      "Visual builder for LLM apps and multi-agent flows. Powers the LangFlow pipeline tool in Workflow Lab.",
    source: "github",
    repoUrl: "https://github.com/langflow-ai/langflow",
    sourceUrl: "https://github.com/langflow-ai/langflow",
    installedAt: Date.now() - 1000 * 60 * 60 * 24,
    enabled: false,
    glyph: "◈",
    color: "axiom-violet",
    running: false,
    category: "Workflow Engine",
    port: 7860,
    workflowEngineId: "langflow",
    connected: false,
    installState: "ready",
    instanceUrl: "http://localhost:7860",
    iconName: "Workflow",
    moduleVersion: "1.0.18",
    moduleProvider: "LangFlow Inc.",
    moduleHealth: "unreachable",
    // Engine-specific project routing. {id} = the LangFlow flow id.
    projectUrlPattern: "/flow/{id}",
  },
  {
    id: "app_custom_flows",
    name: "Axiom Custom Flows",
    description:
      "Axiom OS's built-in node graph engine. No external install required — ships with the OS.",
    source: "builtin",
    installedAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
    enabled: true,
    glyph: "⬢",
    color: "axiom-cyan",
    running: true,
    category: "Workflow Engine",
    port: 3000,
    workflowEngineId: "custom",
    connected: true,
    installState: "core",
    instanceUrl: "http://localhost:3000",
  },

  // ── AI Core infrastructure apps (voice + orchestration) ───────────────────
  // AI Core uses monochrome Lucide line-art icons (iconName) — NO emoji glyphs.
  // This matches the professional tech aesthetic of the workflow-engine blocks.
  {
    id: "app_openjarvis",
    name: "OpenJarvis Core",
    description:
      "System orchestrator for the Jarvis personality layer. Coordinates voice, vision, and reasoning engines into a unified assistant. Detected on the local network — connect to activate the full Jarvis experience.",
    source: "github",
    repoUrl: "https://github.com/open-jarvis/OpenJarvis",
    sourceUrl: "https://github.com/open-jarvis/OpenJarvis",
    installedAt: Date.now() - 1000 * 60 * 60 * 24,
    enabled: false,
    glyph: "",
    iconName: "Brain",
    color: "axiom-cyan",
    running: false,
    category: "AI Core",
    port: 5000,
    connected: false,
    installState: "ready",
    instanceUrl: "http://localhost:5000",
  },
  {
    id: "app_kokoro",
    name: "Kokoro TTS Voice Engine",
    description:
      "Text-to-speech engine that gives Jarvis its voice. Lightweight, fast, and natural-sounding. Initialize to enable voice output on the Home chat terminal.",
    source: "github",
    repoUrl: "https://github.com/hexgrad/kokoro",
    sourceUrl: "https://github.com/hexgrad/kokoro",
    installedAt: Date.now() - 1000 * 60 * 60 * 24,
    enabled: false,
    glyph: "",
    iconName: "Volume2",
    color: "axiom-violet",
    running: false,
    category: "AI Core",
    port: 8000,
    connected: false,
    installState: "ready",
    instanceUrl: "http://localhost:8000",
  },
  {
    id: "app_whisper",
    name: "Faster-Whisper STT",
    description:
      "Speech-to-text engine for voice input. Listening by default — click the microphone icon on the Home chat terminal to dictate your message.",
    source: "github",
    repoUrl: "https://github.com/SYSTRAN/faster-whisper",
    sourceUrl: "https://github.com/SYSTRAN/faster-whisper",
    installedAt: Date.now() - 1000 * 60 * 60 * 24,
    enabled: true,
    glyph: "",
    iconName: "Mic",
    color: "axiom-emerald",
    running: true,
    category: "AI Core",
    port: 8001,
    connected: true,
    installState: "installed",
    instanceUrl: "http://localhost:8001",
  },
  {
    id: "app_elevenlabs",
    name: "ElevenLabs Voice Synthesis",
    description:
      "Premium neural voice synthesis and cloning API. Generates ultra-realistic speech for agent voice output and narration. Connect an API key to enable high-fidelity TTS across the OS.",
    source: "github",
    repoUrl: "https://github.com/elevenlabs/elevenlabs-python",
    sourceUrl: "https://github.com/elevenlabs/elevenlabs-python",
    installedAt: Date.now() - 1000 * 60 * 60 * 24,
    enabled: false,
    glyph: "",
    iconName: "AudioWaveform",
    color: "axiom-amber",
    running: false,
    category: "AI Core",
    port: 8080,
    connected: false,
    installState: "ready",
    instanceUrl: "https://api.elevenlabs.io",
  },

  // ── Real integrated workspace app ────────────────────────────────────────
  // Creative Testing Lab — a real Axiom OS integration. Runs as a native
  // keep-alive tab inside the OS viewport (no separate window), referencing
  // the active staging build on Vercel. Agents can read layout parameters,
  // inject automated data, and navigate the view stack in-process.
  {
    id: "app_creative_testing_lab",
    name: "Creative Testing Lab",
    description:
      "Integrated creative testing workspace. Runs inline as a native Axiom OS route — agents can read layout parameters, inject automated data, and navigate the view stack without opening a separate window.",
    source: "github",
    repoUrl: "https://github.com/AxiomSyntax/creative-testing-lab",
    sourceUrl: "https://github.com/AxiomSyntax/creative-testing-lab",
    liveUrl: "https://creative-testing-lab.vercel.app",
    installedAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    enabled: true,
    glyph: "", // line-art icon used instead — see iconName
    iconName: "FlaskConical",
    color: "axiom-cyan",
    running: false,
    category: "Creative",
    installState: "installed",
  },
];

// ── LLM Providers ───────────────────────────────────────────────────────────

export const SEED_PROVIDERS: LLMProvider[] = [
  {
    id: "zai",
    name: "Z.ai",
    glyph: "✦",
    color: "axiom-cyan",
    apiBase: "https://api.z.ai/v1",
    apiKey: "",
    enabled: true,
    connected: true,
    defaultModelId: "glm-4.6",
    models: [
      { id: "glm-4.6", name: "GLM-4.6", contextWindow: 128000, costPer1kInput: 0.002, costPer1kOutput: 0.008, capabilities: ["chat", "vision", "tools"] },
      { id: "glm-4.5", name: "GLM-4.5", contextWindow: 128000, costPer1kInput: 0.001, costPer1kOutput: 0.004, capabilities: ["chat", "tools"] },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    glyph: "◎",
    color: "axiom-emerald",
    apiBase: "https://api.openai.com/v1",
    apiKey: "",
    enabled: false,
    connected: false,
    models: [
      { id: "gpt-4o", name: "GPT-4o", contextWindow: 128000, costPer1kInput: 0.005, costPer1kOutput: 0.015, capabilities: ["chat", "vision", "tools"] },
      { id: "gpt-4o-mini", name: "GPT-4o mini", contextWindow: 128000, costPer1kInput: 0.0003, costPer1kOutput: 0.0012, capabilities: ["chat", "vision"] },
      { id: "o1", name: "o1", contextWindow: 200000, costPer1kInput: 0.015, costPer1kOutput: 0.060, capabilities: ["chat", "reasoning"] },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    glyph: "▲",
    color: "axiom-amber",
    apiBase: "https://api.anthropic.com/v1",
    apiKey: "",
    enabled: false,
    connected: false,
    models: [
      { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet", contextWindow: 200000, costPer1kInput: 0.003, costPer1kOutput: 0.015, capabilities: ["chat", "vision", "tools"] },
      { id: "claude-3-opus", name: "Claude 3 Opus", contextWindow: 200000, costPer1kInput: 0.015, costPer1kOutput: 0.075, capabilities: ["chat", "vision"] },
      { id: "claude-3-haiku", name: "Claude 3 Haiku", contextWindow: 200000, costPer1kInput: 0.00025, costPer1kOutput: 0.00125, capabilities: ["chat", "vision"] },
    ],
  },
  {
    id: "mistral",
    name: "Mistral",
    glyph: "✶",
    color: "axiom-rose",
    apiBase: "https://api.mistral.ai/v1",
    apiKey: "",
    enabled: false,
    connected: false,
    models: [
      { id: "mistral-large", name: "Mistral Large", contextWindow: 128000, costPer1kInput: 0.004, costPer1kOutput: 0.012, capabilities: ["chat", "tools"] },
      { id: "mistral-small", name: "Mistral Small", contextWindow: 32000, costPer1kInput: 0.0002, costPer1kOutput: 0.0006, capabilities: ["chat"] },
    ],
  },
  {
    id: "groq",
    name: "Groq",
    glyph: "⚡",
    color: "axiom-violet",
    apiBase: "https://api.groq.com/openai/v1",
    apiKey: "",
    enabled: false,
    connected: false,
    models: [
      { id: "llama-3.3-70b", name: "Llama 3.3 70B", contextWindow: 128000, costPer1kInput: 0.00059, costPer1kOutput: 0.00079, capabilities: ["chat", "tools"] },
      { id: "mixtral-8x7b", name: "Mixtral 8x7B", contextWindow: 32000, costPer1kInput: 0.00024, costPer1kOutput: 0.00024, capabilities: ["chat"] },
    ],
  },
  {
    id: "cohere",
    name: "Cohere",
    glyph: "◇",
    color: "axiom-cyan",
    apiBase: "https://api.cohere.ai/v1",
    apiKey: "",
    enabled: false,
    connected: false,
    models: [
      { id: "command-r-plus", name: "Command R+", contextWindow: 128000, costPer1kInput: 0.0025, costPer1kOutput: 0.01, capabilities: ["chat", "tools"] },
    ],
  },
];

// ── MCP Servers (seed) ─────────────────────────────────────────────────────

export const SEED_MCPS: MCPServer[] = [
  {
    id: "mcp_filesystem",
    name: "Filesystem MCP",
    url: "stdio://filesystem",
    enabled: true,
    connected: true,
    tools: ["read_file", "write_file", "list_directory", "search_files"],
    description: "Local filesystem access via MCP.",
  },
  {
    id: "mcp_github",
    name: "GitHub MCP",
    url: "https://mcp.github.com",
    enabled: false,
    connected: false,
    tools: ["create_issue", "search_repos", "get_file_contents"],
    description: "Interact with GitHub repositories.",
  },
  {
    id: "mcp_postgres",
    name: "Postgres MCP",
    url: "postgres://localhost:5432",
    enabled: false,
    connected: false,
    tools: ["query", "list_tables", "describe_table"],
    description: "Query PostgreSQL databases.",
  },
];

// ── Engines (technical control center for AI models & backends) ────────────

export const SEED_ENGINES: Engine[] = [
  // ══════════════════════════════════════════════════════════════════════════
  //  UNIFIED TERMINAL DROPDOWN — CATEGORY A: ENGINES (v0.6)
  //  Development & Automation Environments. Selecting any item here toggles the
  //  terminal into "Development Engine Mode" (compilation + heavy workflows).
  //  Each engine carries its mandated brand color + glyph.
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: "eng_hermes",
    name: "Hermes Agent",
    type: "Local Loop",
    description:
      "Hermes is Axiom OS's in-process autonomous agent. It learns from every conversation, writes scripts into the DevLab, and routes work to other engines. Runs locally inside the browser sandbox — no external dependencies.",
    kind: "autonomous",
    status: "active",
    location: "Local",
    apiAddress: "http://localhost:3000",
    defaultApiAddress: "http://localhost:3000",
    enabled: true,
    glyph: "🜂",
    color: "axiom-emerald",
    models: ["hermes-core", "hermes-scripter"],
    config: {
      "Max concurrent tasks": "4",
      "Auto-ingest to graph": "true",
      "Script timeout (s)": "30",
    },
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
  },
  {
    id: "eng_openclaw",
    name: "OpenClaw",
    type: "Gateway Interface",
    description:
      "OpenClaw is the gateway interface that routes skill invocations and messenger traffic between Axiom OS and remote agent frameworks. Connects via REST API and requires a valid endpoint.",
    kind: "gateway",
    status: "connected",
    location: "API",
    apiAddress: "https://api.openclaw.dev",
    defaultApiAddress: "https://api.openclaw.dev",
    enabled: true,
    lastTestedAt: Date.now() - 1000 * 60 * 12,
    lastTestOk: true,
    glyph: "🦞",
    color: "axiom-rose",
    models: ["Claude 3.5 Sonnet", "Claude 3 Opus", "DeepSeek-R1"],
    config: {
      "API key": "(set in Settings)",
      "Timeout (s)": "60",
      "Retry attempts": "3",
      "Webhook secret": "(optional)",
    },
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
  },
  {
    id: "eng_codex",
    name: "Codex",
    type: "OpenAI Syntax Engine",
    description:
      "Codex is the OpenAI syntax engine — high-speed syntactical code completion and algorithm generation. Optimized for rapid token throughput on code tasks. Routes through the OpenAI-compatible endpoint.",
    kind: "code-completion",
    status: "standby",
    location: "API",
    apiAddress: "https://api.openai.com/v1",
    defaultApiAddress: "https://api.openai.com/v1",
    enabled: true,
    glyph: "⚡",
    color: "axiom-sapphire",
    models: ["code-davinci-002", "gpt-4o-mini"],
    config: {
      "Max tokens": "4096",
      "Temperature": "0.2",
      "Top-P": "0.95",
    },
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
  },
  {
    id: "eng_claude_code",
    name: "Claude Code",
    type: "Anthropic CLI Core",
    description:
      "Claude Code is the Anthropic CLI core — frontier reasoning for structural system architecture and complex debugging. Excels at multi-step planning, code review, and nuanced understanding of large codebases.",
    kind: "reasoning",
    status: "connected",
    location: "API",
    apiAddress: "https://api.anthropic.com/v1",
    defaultApiAddress: "https://api.anthropic.com/v1",
    enabled: true,
    lastTestedAt: Date.now() - 1000 * 60 * 5,
    lastTestOk: true,
    glyph: "🧠",
    color: "axiom-amber",
    models: ["claude-sonnet-4-20250514", "claude-opus-4-20250514"],
    config: {
      "Max tokens": "8192",
      "Thinking budget": "auto",
      "Safety mode": "standard",
    },
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 6,
  },
  {
    id: "eng_freeclaude_code",
    name: "FreeClaude Code",
    type: "Open-Weight Synthesis Alternative",
    description:
      "FreeClaude Code is the open-weight synthesis alternative — long-context code synthesis engine. Specializes in generating large codebases and understanding deep repository context. Supports up to 128k context windows.",
    kind: "code-synthesis",
    status: "standby",
    location: "API",
    apiAddress: "https://api.freeclaud.ai/v1",
    defaultApiAddress: "https://api.freeclaud.ai/v1",
    enabled: true,
    glyph: "🐙",
    color: "axiom-silver",
    models: ["freeclaud-v2-128k", "freeclaud-v2-32k"],
    config: {
      "Context window": "131072",
      "Temperature": "0.3",
      "Code lens mode": "enabled",
    },
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
  },
  {
    id: "eng_antigravity",
    name: "Anti-Gravity",
    type: "Gemini Cloud Orchestration",
    description:
      "Anti-Gravity is the Gemini cloud orchestration engine — advanced cloud orchestration and custom API pipeline connections. Handles multi-step workflow routing, payload transformation, and third-party service integration at scale via Google's Gemini backbone.",
    kind: "cloud-orchestration",
    status: "standby",
    location: "API",
    apiAddress: "https://generativelanguage.googleapis.com/v1",
    defaultApiAddress: "https://generativelanguage.googleapis.com/v1",
    enabled: true,
    glyph: "🌀",
    color: "axiom-violet",
    models: ["Gemini 2.5 Pro", "Gemini 2.0 Flash"],
    config: {
      "Pipeline timeout (s)": "120",
      "Max concurrent pipes": "8",
      "Retry backoff": "exponential",
    },
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 4,
  },
  {
    id: "eng_tavily",
    name: "Tavily / Perplexity",
    type: "Live Web-Search & Document Scraping",
    description:
      "Live Web-Search & Document Scraping Engine ensuring all generated code utilizes up-to-date API parameters, documentation, and best practices. Provides real-time context injection for any engine.",
    kind: "web-search",
    status: "active",
    location: "API",
    apiAddress: "https://api.tavily.com",
    defaultApiAddress: "https://api.tavily.com",
    enabled: true,
    glyph: "🔍",
    color: "axiom-cyan",
    models: ["tavily-search", "tavily-extract", "perplexity-sonar"],
    config: {
      "Search depth": "basic",
      "Max results": "5",
      "Include domains": "docs.python.org,developer.mozilla.org",
    },
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 4,
  },
  {
    id: "eng_siliconflow",
    name: "SiliconFlow",
    type: "Ultra-Low Latency Inference API",
    description:
      "Ultra-low latency API provider for massive open-weight models including DeepSeek, Qwen series, and more. Optimized for high-throughput production workloads with sub-100ms first-token latency.",
    kind: "inference-api",
    status: "standby",
    location: "API",
    apiAddress: "https://api.siliconflow.cn/v1",
    defaultApiAddress: "https://api.siliconflow.cn/v1",
    enabled: false,
    glyph: "🔥",
    color: "axiom-graphite",
    models: ["deepseek-ai/DeepSeek-V3", "Qwen/Qwen2.5-72B-Instruct", "deepseek-ai/DeepSeek-R1"],
    config: {
      "Default model": "deepseek-ai/DeepSeek-V3",
      "Max tokens": "4096",
      "Stream": "true",
    },
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
  },
  {
    id: "eng_coderabbit",
    name: "CodeRabbit / Griptile",
    type: "Automated Code Review Pipeline",
    description:
      "Asynchronous, event-driven automated code review and syntax checking pipeline. Hooks into git events to provide real-time PR reviews, security scans, and style enforcement.",
    kind: "code-review",
    status: "standby",
    location: "Hybrid",
    apiAddress: "https://api.coderabbit.ai/v2",
    defaultApiAddress: "https://api.coderabbit.ai/v2",
    enabled: false,
    glyph: "🐰",
    color: "axiom-emerald",
    models: ["coderabbit-review-v4", "griptile-scan-v2"],
    config: {
      "Auto-review PRs": "true",
      "Security scan": "true",
      "Review language": "english",
    },
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 1,
  },
  {
    id: "eng_kimi_code",
    name: "Kimi Code",
    type: "Moonshot AI Code Synthesis Engine",
    description:
      "Moonshot AI's advanced code synthesis and reasoning engine. Excels at long-context code generation and multi-file refactoring.",
    kind: "code-synthesis",
    status: "standby",
    location: "API",
    apiAddress: "https://api.moonshot.cn/v1",
    defaultApiAddress: "https://api.moonshot.cn/v1",
    enabled: false,
    glyph: "🌙",
    color: "axiom-indigo",
    models: ["kimi-k2", "kimi-k2-thinking"],
    config: {
      "Max tokens": "8192",
      "Temperature": "0.3",
      "Context window": "131072",
    },
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 1,
  },
];

// ════════════════════════════════════════════════════════════════════════════
//  UNIFIED TERMINAL DROPDOWN — CATEGORY B: DIRECT LLMs (v0.6)
//  Ambient & Status Language Models for general conversational tasks. Selecting
//  any item here toggles the terminal into "Ambient Chat Mode" (quick system
//  reads, metrics, natural dialogue). These are direct API model connections,
//  NOT engines — they route through their respective provider's cloud API.
// ════════════════════════════════════════════════════════════════════════════

export interface DirectLLM {
  id: string;
  name: string;
  /** The provider connection this model routes through. */
  provider: string;
  /** Accent color token (matches the provider's brand). */
  color: string;
  /** Glyph for the dropdown row. */
  glyph: string;
  /** The API model identifier. */
  modelId: string;
}

export const SEED_DIRECT_LLMS: DirectLLM[] = [
  {
    id: "llm_gpt4o",
    name: "GPT-4o",
    provider: "OpenAI Direct",
    color: "axiom-emerald",
    glyph: "◉",
    modelId: "gpt-4o-2024-08-06",
  },
  {
    id: "llm_gpt4o_mini",
    name: "GPT-4o-mini",
    provider: "OpenAI Direct",
    color: "axiom-emerald",
    glyph: "◉",
    modelId: "gpt-4o-mini-2024-07-18",
  },
  {
    id: "llm_claude35_sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic Direct",
    color: "axiom-amber",
    glyph: "◈",
    modelId: "claude-3-5-sonnet-20241022",
  },
  {
    id: "llm_gemini2_flash",
    name: "Gemini 2.0 Flash",
    provider: "Google Gemini",
    color: "axiom-cyan",
    glyph: "◇",
    modelId: "gemini-2.0-flash-001",
  },
  {
    id: "llm_qwen25",
    name: "Qwen 2.5",
    provider: "SiliconFlow",
    color: "axiom-graphite",
    glyph: "⬢",
    modelId: "Qwen/Qwen2.5-72B-Instruct",
  },
  {
    id: "llm_deepseek_r1",
    name: "DeepSeek-R1",
    provider: "SiliconFlow",
    color: "axiom-navy",
    glyph: "⬡",
    modelId: "deepseek-ai/DeepSeek-R1",
  },
];


// ── Brain folders (seed) ───────────────────────────────────────────────────

export function seedFolders(): BrainFolder[] {
  return [
    { id: "f_root", name: "Root", parentId: null, color: "axiom-cyan" },
    { id: "f_agents", name: "Agents", parentId: "f_root", color: "axiom-emerald" },
    { id: "f_concepts", name: "Concepts", parentId: "f_root", color: "axiom-cyan" },
    { id: "f_artifacts", name: "Artifacts", parentId: "f_root", color: "axiom-violet" },
    { id: "f_events", name: "Events", parentId: "f_root", color: "axiom-amber" },
    { id: "f_oracle", name: "Oracle Notes", parentId: "f_agents", color: "axiom-cyan" },
    { id: "f_forge", name: "Forge Snippets", parentId: "f_agents", color: "axiom-emerald" },
  ];
}

// ── Seed memory graph ──────────────────────────────────────────────────────

export function seedMemoryGraph(): MemoryGraph {
  const now = Date.now();
  const nodes: MemoryGraph["nodes"] = [
    { id: "n_axiom", label: "Axiom OS", kind: "concept", content: "# Axiom OS\n\nThe **agentic operating system** — a graph-universe memory orchestrating AI agents.\n\n## Core Pillars\n\n- **Graph Universe** — persistent semantic memory\n- [[Agent Integration Layer]] — pluggable multi-agent runtime\n- [[VibeCode Lab]] — self-modifying code engine\n\n### Status\n\n1. Memory indexing: 98%\n2. Agent council: active\n3. DevLab: compiling\n\n___\n\n> The system learns. The system adapts. The system *becomes*.\n\n### Task Board\n\n- [x] Boot sequence complete\n- [x] Graph memory initialized\n- [ ] Wire remaining context-menu actions\n- [ ] Ship Live Preview editor\n\n### Code Sample\n\n```typescript\nconst axiom = new AxiomOS({\n  engine: 'hermes',\n  memory: 'graph-universe',\n});\nawait axiom.boot();\n```\n\nInline code: use `axiom.connect()` to link engines.\n\n~~Deprecated:~~ use the new `axiom.link()` API instead.", x: 0, y: 0, vx: 0, vy: 0, pinned: true, createdAt: now, folderId: "f_concepts", meta: { tier: 0 } },
    { id: "n_memory", label: "Graph Universe", kind: "concept", content: "Persistent memory layer: nodes, edges, semantic links.", x: -180, y: -120, vx: 0, vy: 0, pinned: false, createdAt: now, folderId: "f_concepts" },
    { id: "n_agents", label: "Agent Integration Layer", kind: "concept", content: "Pluggable multi-agent runtime.", x: 180, y: -120, vx: 0, vy: 0, pinned: false, createdAt: now, folderId: "f_concepts" },
    { id: "n_vibe", label: "VibeCode Lab", kind: "concept", content: "In-app development laboratory.", x: 0, y: 180, vx: 0, vy: 0, pinned: false, createdAt: now, folderId: "f_concepts" },

    { id: "a_oracle", label: "Oracle", kind: "agent", content: "Reasoning core.", x: 260, y: 20, vx: 0, vy: 0, pinned: false, createdAt: now, folderId: "f_oracle" },
    { id: "a_forge", label: "Forge", kind: "agent", content: "Code synthesist.", x: 320, y: -60, vx: 0, vy: 0, pinned: false, createdAt: now, folderId: "f_forge" },
    { id: "a_scribe", label: "Scribe", kind: "agent", content: "Memory curator.", x: -260, y: 20, vx: 0, vy: 0, pinned: false, createdAt: now, folderId: "f_agents" },
    { id: "a_warden", label: "Warden", kind: "agent", content: "Policy & safety.", x: -200, y: -180, vx: 0, vy: 0, pinned: false, createdAt: now, folderId: "f_agents" },

    { id: "e_boot", label: "Boot Sequence", kind: "event", content: "System initialised.", x: 60, y: -220, vx: 0, vy: 0, pinned: false, createdAt: now, folderId: "f_events" },
    { id: "e_firstmsg", label: "First Conversation", kind: "event", content: "Awaited.", x: -60, y: 220, vx: 0, vy: 0, pinned: false, createdAt: now, folderId: "f_events" },
  ];

  const edges: MemoryGraph["edges"] = [
    { id: "ed1", source: "n_axiom", target: "n_memory", kind: "produces", weight: 1 },
    { id: "ed2", source: "n_axiom", target: "n_agents", kind: "produces", weight: 1 },
    { id: "ed3", source: "n_axiom", target: "n_vibe", kind: "produces", weight: 1 },
    { id: "ed4", source: "n_agents", target: "a_oracle", kind: "spawned-by", weight: 1 },
    { id: "ed5", source: "n_agents", target: "a_forge", kind: "spawned-by", weight: 1 },
    { id: "ed6", source: "n_agents", target: "a_scribe", kind: "spawned-by", weight: 1 },
    { id: "ed7", source: "n_agents", target: "a_warden", kind: "spawned-by", weight: 1 },
    { id: "ed8", source: "a_scribe", target: "n_memory", kind: "consumes", weight: 1 },
    { id: "ed9", source: "a_forge", target: "n_vibe", kind: "executes", weight: 1 },
    { id: "ed10", source: "a_warden", target: "n_vibe", kind: "depends-on", weight: 0.6 },
    { id: "ed11", source: "e_boot", target: "n_axiom", kind: "relates", weight: 0.5 },
    { id: "ed12", source: "e_firstmsg", target: "n_memory", kind: "relates", weight: 0.4 },
  ];

  return { nodes, edges };
}

// ── Seed VibeCode / DevLab files ───────────────────────────────────────────

export const SEED_VIBE_FILES: VibeFile[] = [
  // ── Real Axiom OS system files (mirrors of actual on-disk source) ────────
  // These appear at the top of the DevLab file tree. Editing them (via Forge
  // or directly) is framed as editing the running OS's source code.
  {
    id: "vf_sys_app",
    name: "App.jsx",
    language: "typescript",
    isSystemFile: true,
    systemPath: "src/app/page.tsx",
    description: "Root page — boots Axiom OS into the AppShell.",
    folder: "system",
    source: `"use client";

import { useAxiom } from "@/lib/axiom/store";
import BootScreen from "@/components/axiom/BootScreen";
import AppShell from "@/components/axiom/AppShell";

export default function Page() {
  const bootPhase = useAxiom((s) => s.bootPhase);
  return bootPhase === "booting" ? <BootScreen /> : <AppShell />;
}
`,
    updatedAt: Date.now(),
  },
  {
    id: "vf_sys_home",
    name: "Home.jsx",
    language: "typescript",
    isSystemFile: true,
    systemPath: "src/components/axiom/pages/HomePage.tsx",
    description: "The Jarvis-style central AI interface — giant orb + chat terminal.",
    folder: "system",
    source: `"use client";

// HomePage — the immersive Jarvis-style central AI interface.
// Features: giant animated orb, engine switcher, model selector,
// chat terminal wired to /api/axiom/agent.

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAxiom } from "@/lib/axiom/store";
import { GiantOrb, EngineSwitcher, ModelSwitcher } from "./modules";

export default function HomePage() {
  const [activeEngineId, setActiveEngineId] = useState("eng_hermes");
  // ... chat state, message history, send() ...

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* Ambient backdrop glow follows active engine color */}
      <BackdropGlow color={activeEngine?.color} />

      {/* Top brand bar */}
      <header className="px-6 pt-6 pb-4 shrink-0 z-10">
        <h1 className="text-sm font-medium tracking-[0.28em] uppercase">
          Axiom <span className="text-axiom-cyan">OS</span>
        </h1>
      </header>

      {/* Center column: Giant Orb + Chat Terminal */}
      <main className="flex-1 flex flex-col items-center">
        <GiantOrb color={orbColor} engineName={activeEngine?.name} />
        <ChatTerminal engine={activeEngine} />
      </main>
    </div>
  );
}
`,
    updatedAt: Date.now(),
  },
  {
    id: "vf_sys_dashboard",
    name: "Dashboard.jsx",
    language: "typescript",
    isSystemFile: true,
    systemPath: "src/components/axiom/pages/DashboardPage.tsx",
    description: "OS overview — telemetry charts, cost-by-agent, active agents.",
    folder: "system",
    source: `"use client";

import { useAxiom } from "@/lib/axiom/store";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function DashboardPage() {
  const { telemetry, installedAgents, graph } = useAxiom();

  // Renders:
  // - 4 top stat cards (CPU / Memory / Network / API Spend)
  // - Telemetry area chart (last 60s)
  // - Cost-by-agent bar chart
  // - Running apps panel
  // - Integration overview grid
  // - Active agents list with per-agent cost
  // - Recent activity log

  return (
    <div className="h-full overflow-y-auto axiom-scroll p-6 space-y-5">
      <StatCards telemetry={telemetry} agents={installedAgents} />
      <TelemetryChart data={telemetry} />
      <CostByAgent agents={installedAgents} />
      <ActiveAgentsList agents={installedAgents} />
    </div>
  );
}
`,
    updatedAt: Date.now(),
  },
  {
    id: "vf_sys_engines",
    name: "Engines.jsx",
    language: "typescript",
    isSystemFile: true,
    systemPath: "src/components/axiom/pages/EnginesPage.tsx",
    description: "Technical control center — Hermes, OpenClaw, Ollama engine cards.",
    folder: "system",
    source: `"use client";

import { useAxiom } from "@/lib/axiom/store";
import type { Engine } from "@/lib/axiom/types";

// EnginesPage — technical control center for AI models & backends.
// Shows 3 engine cards: Hermes Agent (Active/Local),
// OpenClaw Gateway (Connected/API), Ollama Local (Standby).

export default function EnginesPage() {
  const { engines, updateEngine, testEngine, toggleEngine } = useAxiom();

  return (
    <div className="h-full flex flex-col">
      <Header count={engines.length} />
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
        {engines.map((e) => (
          <EngineCard
            key={e.id}
            engine={e}
            onTest={() => testEngine(e.id)}
            onToggle={() => toggleEngine(e.id)}
          />
        ))}
      </div>
    </div>
  );
}

// Each card has: status dot, API address input,
// Test Connection button, Settings button.
function EngineCard({ engine }: { engine: Engine }) {
  // ...
}
`,
    updatedAt: Date.now(),
  },
  {
    id: "vf_sys_globalcss",
    name: "global.css",
    language: "markdown",
    isSystemFile: true,
    systemPath: "src/app/globals.css",
    description: "Theme tokens — colors, fonts, animations, the deep-space palette.",
    folder: "system",
    source: `@import "tailwindcss";
@import "tw-animate-css";

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-axiom-cyan: var(--axiom-cyan);
  --color-axiom-emerald: var(--axiom-emerald);
  --color-axiom-amber: var(--axiom-amber);
  --color-axiom-violet: var(--axiom-violet);
  --color-axiom-rose: var(--axiom-rose);
  /* ... */
}

:root {
  --axiom-void: oklch(0.10 0.02 260);
  --axiom-deep: oklch(0.14 0.03 260);
  --axiom-panel: oklch(0.18 0.035 260);
  --axiom-edge: oklch(0.28 0.04 260);
  --axiom-cyan: oklch(0.78 0.13 195);
  --axiom-emerald: oklch(0.74 0.16 165);
  --axiom-amber: oklch(0.80 0.15 75);
  --axiom-violet: oklch(0.65 0.18 305);
  --axiom-rose: oklch(0.68 0.20 15);
}

/* Animations: pulse-ring, boot-bar, scan, blink, float */
@keyframes axiom-pulse-ring { /* ... */ }
@keyframes axiom-scan { /* ... */ }
`,
    updatedAt: Date.now(),
  },
  {
    id: "vf_sys_package",
    name: "package.json",
    language: "markdown",
    isSystemFile: true,
    systemPath: "package.json",
    description: "Project manifest — dependencies, scripts, metadata.",
    folder: "system",
    source: `{
  "name": "axiom-os",
  "version": "0.2.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "lint": "eslint ."
  },
  "dependencies": {
    "next": "^16.1.1",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5",
    "tailwindcss": "^4",
    "zustand": "^5.0.6",
    "framer-motion": "^12.23.2",
    "lucide-react": "^0.525.0",
    "z-ai-web-dev-sdk": "^0.0.18",
    "recharts": "^2.15.4",
    "react-syntax-highlighter": "^15.6.1"
  }
}
`,
    updatedAt: Date.now(),
  },

  // ── Vibecoded / sandbox files (regular editable scripts) ─────────────────
  {
    id: "vf_app",
    name: "Calculator.app.js",
    language: "javascript",
    source: `// A vibecoded app: simple calculator.
// Apps return { result } which is displayed to the user.

function calc(expr) {
  try { return Function('"use strict"; return (' + expr + ')')(); }
  catch (e) { return "Error: " + e.message; }
}

return { result: calc("2 + 2 * 3") }; // 8
`,
    updatedAt: Date.now(),
    folder: "apps",
  },
  {
    id: "vf_prompt",
    name: "intent.prompt",
    language: "prompt",
    source: `# Prompt mode
# Describe what you want Forge to build. Warden will review it first.

Build a node that visualises real-time agent activity as a radial pulse.`,
    updatedAt: Date.now(),
    folder: "prompts",
  },
];

// ── Seed activity log ──────────────────────────────────────────────────────

export function seedActivity(): ActivityEntry[] {
  const now = Date.now();
  return [
    { id: "ac1", ts: now - 1000 * 60 * 1, kind: "agent", text: "Oracle replied to a question about Axiom OS architecture.", severity: "info" },
    { id: "ac2", ts: now - 1000 * 60 * 5, kind: "vibecode", text: "hello.axiom.js executed — artifact written to graph.", severity: "success" },
    { id: "ac3", ts: now - 1000 * 60 * 12, kind: "memory", text: "Scribe ingested 3 new nodes from conversation.", severity: "info" },
    { id: "ac4", ts: now - 1000 * 60 * 24, kind: "system", text: "Telemetry sampler started (2s interval).", severity: "info" },
    { id: "ac5", ts: now - 1000 * 60 * 47, kind: "integration", text: "Z.ai provider connected.", severity: "success" },
    { id: "ac6", ts: now - 1000 * 60 * 60 * 2, kind: "system", text: "Axiom OS booted.", severity: "info" },
  ];
}

// ── Build integrations registry from other registries ─────────────────────

export function buildIntegrations(
  agents: InstalledAgent[],
  apps: InstalledApp[],
  tools: Tool[],
  skills: Skill[],
  providers: LLMProvider[],
  mcps: MCPServer[],
): Integration[] {
  const out: Integration[] = [];
  for (const a of agents) {
    out.push({
      id: "int_agent_" + a.id,
      name: a.name,
      kind: "agent",
      enabled: a.enabled,
      status: a.enabled ? "active" : "disabled",
      description: a.description,
      category: a.category,
      glyph: a.glyph,
      color: a.color,
    });
  }
  for (const ap of apps) {
    out.push({
      id: "int_app_" + ap.id,
      name: ap.name,
      kind: "app",
      enabled: ap.enabled,
      status: ap.enabled ? (ap.running ? "active" : "idle") : "disabled",
      description: ap.description,
      category: ap.category,
      glyph: ap.glyph,
      color: ap.color,
    });
  }
  for (const t of tools) {
    out.push({
      id: "int_tool_" + t.id,
      name: t.name,
      kind: "tool",
      enabled: t.enabled,
      status: t.enabled ? "idle" : "disabled",
      description: t.description,
      category: t.category,
      glyph: t.glyph,
      color: "axiom-cyan",
    });
  }
  for (const s of skills) {
    out.push({
      id: "int_skill_" + s.id,
      name: s.name,
      kind: "skill",
      enabled: s.enabled,
      status: s.enabled ? "idle" : "disabled",
      description: s.description,
      category: s.category,
      glyph: s.glyph,
      color: "axiom-emerald",
    });
  }
  for (const p of providers) {
    out.push({
      id: "int_llm_" + p.id,
      name: p.name,
      kind: "llm",
      enabled: p.enabled,
      status: p.enabled ? (p.connected ? "active" : "error") : "disabled",
      description: `${p.models.length} models available`,
      category: "LLM",
      glyph: p.glyph,
      color: p.color,
    });
  }
  for (const m of mcps) {
    out.push({
      id: "int_mcp_" + m.id,
      name: m.name,
      kind: "mcp",
      enabled: m.enabled,
      status: m.enabled ? (m.connected ? "active" : "error") : "disabled",
      description: m.description ?? `${m.tools.length} tools`,
      category: "MCP",
      glyph: "🔌",
      color: "axiom-violet",
    });
  }
  return out;
}

// ── Seed chat projects + sessions (unified archive) ────────────────────────

export const SEED_CHAT_PROJECTS: ChatProject[] = [
  { id: "proj_jarvis", name: "Jarvis Central Chats", color: "axiom-cyan", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5, source: "home" },
  { id: "proj_axiom", name: "Project: Axiom Development", color: "axiom-violet", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2, source: "devlab" },
];

export const SEED_CHAT_SESSIONS: ChatSession[] = [
  // ── Jarvis Central Chats (general history) ───────────────────────────────
  {
    id: "sess_voice_04",
    title: "Voice Session #04",
    source: "home",
    projectId: "proj_jarvis",
    engineId: "eng_hermes",
    preview: "Hermes, give me a one-line status report.",
    messages: [
      { id: "m9", role: "user", content: "Hermes, give me a one-line status report.", ts: Date.now() - 1000 * 60 * 45, source: "user" },
      { id: "m10", role: "assistant", content: "System Status: All nominal. Axiom OS operational, graph-universe memory indexing at 98%, DevLab scripts compiling.", ts: Date.now() - 1000 * 60 * 45 + 2000, source: "Hermes Agent" },
    ],
    createdAt: Date.now() - 1000 * 60 * 45,
    updatedAt: Date.now() - 1000 * 60 * 45 + 2000,
  },
  {
    id: "sess_voice_03",
    title: "Voice Session #03",
    source: "home",
    projectId: "proj_jarvis",
    engineId: "eng_ollama",
    preview: "Which model are you?",
    messages: [
      { id: "m11", role: "user", content: "Which model are you?", ts: Date.now() - 1000 * 60 * 60 * 26, source: "user" },
      { id: "m12", role: "assistant", content: "I run open-source models like Llama, Mistral, Phi, and Qwen fully locally on your device.", ts: Date.now() - 1000 * 60 * 60 * 26 + 2000, source: "Ollama Local" },
    ],
    createdAt: Date.now() - 1000 * 60 * 60 * 26,
    updatedAt: Date.now() - 1000 * 60 * 60 * 26 + 2000,
  },
  // ── Workflows Execution Logs ──────────────────────────────────────────
  {
    id: "sess_wf_onboard",
    title: "Customer Onboard Pipeline",
    source: "workflows",
    projectId: null,
    preview: "Automated new-user welcome sequence with email + CRM sync.",
    messages: [
      { id: "mw1", role: "system", content: "[Workflow] Step 1/3 — Forge Agent: Generating personalized welcome email", ts: Date.now() - 1000 * 60 * 120, source: "workflow" },
      { id: "mw2", role: "system", content: "[Workflow] Step 2/3 — Scribe Agent: Logging to CRM", ts: Date.now() - 1000 * 60 * 120 + 4000, source: "workflow" },
      { id: "mw3", role: "system", content: "[Workflow] Step 3/3 — Done. Notification sent.", ts: Date.now() - 1000 * 60 * 120 + 7000, source: "workflow" },
    ],
    createdAt: Date.now() - 1000 * 60 * 120,
    updatedAt: Date.now() - 1000 * 60 * 120 + 7000,
  },
  {
    id: "sess_wf_content",
    title: "Content Generation Chain",
    source: "workflows",
    projectId: null,
    preview: "Research → Draft → Edit → Publish pipeline.",
    messages: [
      { id: "mw4", role: "system", content: "[Workflow] Step 1/4 — Oracle: Trend research completed", ts: Date.now() - 1000 * 60 * 48, source: "workflow" },
      { id: "mw5", role: "system", content: "[Workflow] Step 2/4 — Forge: First draft generated (1,240 words)", ts: Date.now() - 1000 * 60 * 48 + 8000, source: "workflow" },
      { id: "mw6", role: "system", content: "[Workflow] Step 3/4 — Scribe: Copy-edit pass complete", ts: Date.now() - 1000 * 60 * 48 + 12000, source: "workflow" },
      { id: "mw7", role: "system", content: "[Workflow] Step 4/4 — Done. Exported to file.", ts: Date.now() - 1000 * 60 * 48 + 14000, source: "workflow" },
    ],
    createdAt: Date.now() - 1000 * 60 * 48,
    updatedAt: Date.now() - 1000 * 60 * 48 + 14000,
  },
];

// ── LLM Registry — Model Families ──────────────────────────────────────────
// Separate management layer from developmental coding engines.
// Each family has independent toggle states, API key mapping, and fallback priority.

export const SEED_LLM_FAMILIES: LLMFamily[] = [
  // ── 1. OpenAI Suite ─────────────────────────────────────────────────────
  {
    id: "llm_openai",
    name: "OpenAI",
    tagline: "Structured UI workflows & fast ambient tasks",
    description:
      "OpenAI's flagship GPT series. Optimized for structured UI workflows, function calling, JSON-mode output, and fast ambient tasks. GPT-4o handles complex reasoning; o1/o3-mini excel at deep analysis; GPT-4o-mini is the lightweight fallback.",
    glyph: "◉",
    color: "axiom-sapphire",
    apiBase: "https://api.openai.com/v1",
    apiKeyVar: "OPENAI_API_KEY",
    apiKey: "",
    enabled: true,
    keyValidated: false,
    defaultModelId: "openai_gpt4o",
    fallbackPriority: 1,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 10,
    models: [
      {
        id: "openai_gpt4o",
        name: "GPT-4o",
        modelId: "gpt-4o-2024-08-06",
        contextWindow: 128000,
        costPer1kInput: 0.0025,
        costPer1kOutput: 0.01,
        capabilities: ["chat", "vision", "code", "reasoning", "json-mode", "function-calling"],
        enabled: true,
        tier: "flagship",
        description: "Flagship multimodal model — best for complex reasoning with vision.",
      },
      {
        id: "openai_gpt4o_mini",
        name: "GPT-4o-mini",
        modelId: "gpt-4o-mini-2024-07-18",
        contextWindow: 128000,
        costPer1kInput: 0.00015,
        costPer1kOutput: 0.0006,
        capabilities: ["chat", "vision", "code", "json-mode", "function-calling"],
        enabled: true,
        tier: "lightweight",
        description: "Fast and affordable — ideal for high-volume ambient tasks.",
      },
      {
        id: "openai_o1",
        name: "o1",
        modelId: "o1-2024-12-17",
        contextWindow: 200000,
        costPer1kInput: 0.015,
        costPer1kOutput: 0.06,
        capabilities: ["reasoning", "code"],
        enabled: true,
        tier: "flagship",
        description: "Deep reasoning model with extended chain-of-thought.",
      },
      {
        id: "openai_o3_mini",
        name: "o3-mini",
        modelId: "o3-mini-2025-01-31",
        contextWindow: 200000,
        costPer1kInput: 0.0011,
        costPer1kOutput: 0.0044,
        capabilities: ["reasoning", "code", "function-calling"],
        enabled: true,
        tier: "standard",
        description: "Cost-efficient reasoning — strong analysis at lower latency.",
      },
    ],
  },

  // ── 2. Anthropic Suite ──────────────────────────────────────────────────
  {
    id: "llm_anthropic",
    name: "Anthropic",
    tagline: "High-tier contextual analysis",
    description:
      "Anthropic's Claude family. Reserved for high-tier contextual analysis, long-form writing, and nuanced reasoning. Claude 4 Sonnet is the flagship; 3.5 Sonnet is the daily driver; Haiku is the speed tier; Opus handles the most complex tasks.",
    glyph: "◈",
    color: "axiom-amber",
    apiBase: "https://api.anthropic.com/v1",
    apiKeyVar: "ANTHROPIC_API_KEY",
    apiKey: "",
    enabled: true,
    keyValidated: false,
    defaultModelId: "anthropic_claude_4_sonnet",
    fallbackPriority: 2,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 10,
    models: [
      {
        id: "anthropic_claude_4_sonnet",
        name: "Claude 4 Sonnet",
        modelId: "claude-4-sonnet-20250514",
        contextWindow: 200000,
        costPer1kInput: 0.003,
        costPer1kOutput: 0.015,
        capabilities: ["chat", "vision", "code", "reasoning", "json-mode", "function-calling"],
        enabled: true,
        tier: "flagship",
        description: "Latest flagship — best-in-class reasoning with vision and agentic capabilities.",
      },
      {
        id: "anthropic_claude_35_sonnet",
        name: "Claude 3.5 Sonnet",
        modelId: "claude-3-5-sonnet-20241022",
        contextWindow: 200000,
        costPer1kInput: 0.003,
        costPer1kOutput: 0.015,
        capabilities: ["chat", "vision", "code", "reasoning", "json-mode", "function-calling"],
        enabled: true,
        tier: "standard",
        description: "The daily driver — fast, capable, and cost-effective.",
      },
      {
        id: "anthropic_claude_35_haiku",
        name: "Claude 3.5 Haiku",
        modelId: "claude-3-5-haiku-20241022",
        contextWindow: 200000,
        costPer1kInput: 0.001,
        costPer1kOutput: 0.005,
        capabilities: ["chat", "vision", "code", "json-mode", "function-calling"],
        enabled: true,
        tier: "lightweight",
        description: "Speed tier — ultra-fast responses for quick tasks.",
      },
      {
        id: "anthropic_claude_3_opus",
        name: "Claude 3 Opus",
        modelId: "claude-3-opus-20240229",
        contextWindow: 200000,
        costPer1kInput: 0.015,
        costPer1kOutput: 0.075,
        capabilities: ["chat", "vision", "code", "reasoning", "json-mode"],
        enabled: false,
        tier: "flagship",
        description: "Most capable Claude — reserved for the hardest problems.",
      },
    ],
  },

  // ── 3. Google Gemini Suite ──────────────────────────────────────────────
  {
    id: "llm_google",
    name: "Google Gemini",
    tagline: "Multi-modal dashboard scans & low-cost parsing",
    description:
      "Google's Gemini family. Ideal for multi-modal dashboard scans, document parsing, and cost-effective bulk processing. Gemini 2.5 Pro leads on complex reasoning; 2.0 Flash handles speed and cost.",
    glyph: "◇",
    color: "axiom-violet",
    apiBase: "https://generativelanguage.googleapis.com/v1beta",
    apiKeyVar: "GOOGLE_API_KEY",
    apiKey: "",
    enabled: true,
    keyValidated: false,
    defaultModelId: "google_gemini_25_pro",
    fallbackPriority: 3,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 9,
    models: [
      {
        id: "google_gemini_25_pro",
        name: "Gemini 2.5 Pro",
        modelId: "gemini-2.5-pro-preview-05-06",
        contextWindow: 1048576,
        costPer1kInput: 0.00125,
        costPer1kOutput: 0.01,
        capabilities: ["chat", "vision", "code", "reasoning", "json-mode", "function-calling"],
        enabled: true,
        tier: "flagship",
        description: "Latest flagship — top-tier reasoning with 1M context window.",
      },
      {
        id: "google_gemini_2_flash",
        name: "Gemini 2.0 Flash",
        modelId: "gemini-2.0-flash-001",
        contextWindow: 1048576,
        costPer1kInput: 0.0001,
        costPer1kOutput: 0.0004,
        capabilities: ["chat", "vision", "code", "reasoning", "json-mode", "function-calling"],
        enabled: true,
        tier: "standard",
        description: "Fast, capable, and cost-effective — great for everyday tasks.",
      },
    ],
  },

  // ── 4. DeepSeek Family ──────────────────────────────────────────────────
  {
    id: "llm_deepseek",
    name: "DeepSeek",
    tagline: "High-efficiency reasoning & cost-effective chat fallback",
    description:
      "DeepSeek's open-weight models. V3 is a general-purpose powerhouse; R1 is a reasoning specialist with chain-of-thought transparency. Excellent cost-to-performance ratio for chat fallback scenarios.",
    glyph: "⬡",
    color: "axiom-navy",
    apiBase: "https://api.deepseek.com/v1",
    apiKeyVar: "DEEPSEEK_API_KEY",
    apiKey: "",
    enabled: true,
    keyValidated: false,
    defaultModelId: "deepseek_v3",
    fallbackPriority: 4,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 8,
    models: [
      {
        id: "deepseek_v3",
        name: "DeepSeek-V3",
        modelId: "deepseek-chat",
        contextWindow: 131072,
        costPer1kInput: 0.00014,
        costPer1kOutput: 0.00028,
        capabilities: ["chat", "code", "reasoning", "json-mode", "function-calling"],
        enabled: true,
        tier: "standard",
        description: "General-purpose MoE model — exceptional cost/performance.",
      },
      {
        id: "deepseek_r1",
        name: "DeepSeek-R1",
        modelId: "deepseek-reasoner",
        contextWindow: 131072,
        costPer1kInput: 0.00055,
        costPer1kOutput: 0.00219,
        capabilities: ["reasoning", "code", "math"],
        enabled: true,
        tier: "standard",
        description: "Reasoning specialist with transparent chain-of-thought.",
      },
    ],
  },

  // ── 5. Alibaba Qwen Series ──────────────────────────────────────────────
  {
    id: "llm_qwen",
    name: "Alibaba Qwen",
    tagline: "Adaptive open-weight models for local & cloud",
    description:
      "Alibaba's Qwen3 series — highly adaptive open-weight models with MoE architecture. Qwen3-235B is the flagship; 32B runs well locally or via cloud. Excels at multilingual tasks and code generation.",
    glyph: "⬢",
    color: "axiom-graphite",
    apiBase: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKeyVar: "QWEN_API_KEY",
    apiKey: "",
    enabled: false,
    keyValidated: false,
    defaultModelId: "qwen3_235b",
    fallbackPriority: 6,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
    models: [
      {
        id: "qwen3_235b",
        name: "Qwen3-235B",
        modelId: "qwen3-235b-a22b-instruct",
        contextWindow: 131072,
        costPer1kInput: 0.0008,
        costPer1kOutput: 0.0024,
        capabilities: ["chat", "code", "reasoning", "json-mode", "function-calling"],
        enabled: true,
        tier: "flagship",
        description: "Flagship MoE — competitive with GPT-4 class at lower cost.",
      },
      {
        id: "qwen3_32b",
        name: "Qwen3-32B",
        modelId: "qwen3-32b-instruct",
        contextWindow: 131072,
        costPer1kInput: 0.0002,
        costPer1kOutput: 0.0006,
        capabilities: ["chat", "code", "reasoning", "json-mode", "function-calling"],
        enabled: true,
        tier: "standard",
        description: "Strong mid-size model — runs locally or via cloud endpoint.",
      },
    ],
  },

  // ── 6. Mistral AI ───────────────────────────────────────────────────────
  {
    id: "llm_mistral",
    name: "Mistral AI",
    tagline: "European sovereign data & fast inference",
    description:
      "Mistral AI — European sovereign cloud AI. Mistral Large handles complex tasks; Codestral is purpose-built for code; Pixtral adds vision capabilities. Ideal for EU data-residency requirements.",
    glyph: "△",
    color: "axiom-amber",
    apiBase: "https://api.mistral.ai/v1",
    apiKeyVar: "MISTRAL_API_KEY",
    apiKey: "",
    enabled: false,
    keyValidated: false,
    defaultModelId: "mistral_large",
    fallbackPriority: 5,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 6,
    models: [
      {
        id: "mistral_large",
        name: "Mistral Large",
        modelId: "mistral-large-latest",
        contextWindow: 131072,
        costPer1kInput: 0.002,
        costPer1kOutput: 0.006,
        capabilities: ["chat", "code", "reasoning", "json-mode", "function-calling"],
        enabled: true,
        tier: "standard",
        description: "Flagship model — strong multilingual and reasoning.",
      },
      {
        id: "mistral_codestral",
        name: "Codestral",
        modelId: "codestral-latest",
        contextWindow: 32768,
        costPer1kInput: 0.0003,
        costPer1kOutput: 0.0009,
        capabilities: ["code", "json-mode", "function-calling"],
        enabled: true,
        tier: "specialized",
        description: "Purpose-built for code generation and completion.",
      },
      {
        id: "mistral_pixtral",
        name: "Pixtral",
        modelId: "pixtral-large-latest",
        contextWindow: 131072,
        costPer1kInput: 0.002,
        costPer1kOutput: 0.006,
        capabilities: ["chat", "vision", "code", "json-mode"],
        enabled: true,
        tier: "standard",
        description: "Vision-capable model for multimodal workflows.",
      },
    ],
  },

  // ── 7. Meta Llama Fleet ─────────────────────────────────────────────────
  {
    id: "llm_llama",
    name: "Meta Llama",
    tagline: "Open-weight fleet — cloud API or Ollama local",
    description:
      "Meta's Llama 4 family — the latest generation of open-weight models. Maverick is the flagship with 128 experts; Scout is efficient and fast. Can run via cloud APIs or mapped to Ollama Local for full offline privacy.",
    glyph: "🦙",
    color: "axiom-emerald",
    apiBase: "https://api.llama-meta.com/v1",
    apiKeyVar: "LLAMA_API_KEY",
    apiKey: "",
    enabled: false,
    keyValidated: false,
    defaultModelId: "llama_4_maverick",
    fallbackPriority: 7,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
    models: [
      {
        id: "llama_4_maverick",
        name: "Llama 4 Maverick",
        modelId: "llama-4-maverick-17b-128e-instruct",
        contextWindow: 131072,
        costPer1kInput: 0.0004,
        costPer1kOutput: 0.0004,
        capabilities: ["chat", "code", "reasoning", "json-mode", "function-calling", "vision"],
        enabled: true,
        tier: "flagship",
        description: "Flagship MoE — 128 experts, multimodal, state-of-the-art open-weight.",
      },
      {
        id: "llama_4_scout",
        name: "Llama 4 Scout",
        modelId: "llama-4-scout-17b-16e-instruct",
        contextWindow: 131072,
        costPer1kInput: 0.0001,
        costPer1kOutput: 0.0001,
        capabilities: ["chat", "code", "reasoning", "json-mode", "function-calling"],
        enabled: true,
        tier: "standard",
        description: "Efficient MoE — fast inference, competitive with larger models.",
      },
    ],
  },

  // ── 8. Z.ai Native LLMs ─────────────────────────────────────────────────
  {
    id: "llm_zai",
    name: "Z.ai Native",
    tagline: "Proprietary models tied to hosting architecture",
    description:
      "Z.ai's proprietary LLMs directly integrated into the hosting architecture. Zero network latency, deeply optimized for the platform's workflows. Automatically available with no additional configuration.",
    glyph: "⬡",
    color: "axiom-cyan",
    apiBase: "https://api.z.ai/v1",
    apiKeyVar: "ZAI_API_KEY",
    apiKey: "",
    enabled: true,
    keyValidated: true,
    lastValidatedAt: Date.now() - 1000 * 60 * 5,
    defaultModelId: "zai_z1",
    fallbackPriority: 0,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 11,
    models: [
      {
        id: "zai_z1",
        name: "Z-1",
        modelId: "z-1",
        contextWindow: 131072,
        costPer1kInput: 0.0,
        costPer1kOutput: 0.0,
        capabilities: ["chat", "code", "reasoning", "json-mode", "function-calling"],
        enabled: true,
        tier: "standard",
        description: "Primary native model — zero-cost, platform-optimized.",
      },
      {
        id: "zai_z1_mini",
        name: "Z-1-mini",
        modelId: "z-1-mini",
        contextWindow: 65536,
        costPer1kInput: 0.0,
        costPer1kOutput: 0.0,
        capabilities: ["chat", "code", "json-mode", "function-calling"],
        enabled: true,
        tier: "lightweight",
        description: "Lightweight native — ultra-fast, zero-cost, ideal for quick tasks.",
      },
    ],
  },

  // ── 9. Kimi (Moonshot AI) — inherits axiom-indigo from eng_kimi_code ─────
  {
    id: "llm_kimi",
    name: "Kimi",
    tagline: "Moonshot AI — Long-context reasoning & code",
    description:
      "Moonshot AI's Kimi series. Excels at long-context reasoning (131k tokens) and code generation. Kimi K2 is the flagship chat model; K2 Thinking adds deep reasoning for complex multi-step tasks.",
    glyph: "🌙",
    color: "axiom-indigo",
    apiBase: "https://api.moonshot.cn/v1",
    apiKeyVar: "KIMI_API_KEY",
    apiKey: "",
    enabled: false,
    keyValidated: false,
    defaultModelId: "kimi-k2",
    fallbackPriority: 7,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 1,
    models: [
      {
        id: "kimi-k2",
        name: "Kimi K2",
        modelId: "kimi-k2",
        contextWindow: 131072,
        costPer1kInput: 0.001,
        costPer1kOutput: 0.002,
        capabilities: ["chat", "code", "reasoning"],
        enabled: true,
        tier: "flagship",
        description: "Flagship long-context chat + code model from Moonshot AI.",
      },
      {
        id: "kimi-k2-thinking",
        name: "Kimi K2 Thinking",
        modelId: "kimi-k2-thinking",
        contextWindow: 131072,
        costPer1kInput: 0.002,
        costPer1kOutput: 0.004,
        capabilities: ["reasoning", "code", "function-calling"],
        enabled: true,
        tier: "specialized",
        description: "Deep reasoning variant with extended thinking for complex multi-step tasks.",
      },
    ],
  },
];
