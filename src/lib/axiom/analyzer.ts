// ════════════════════════════════════════════════════════════════════════════
//  Repository Analyzer — Multi-Stage Intelligent Classification Pipeline
// ════════════════════════════════════════════════════════════════════════════
//
//  Instead of a single heuristic, the analyzer runs a 7-stage pipeline:
//
//    Repository
//      ↓
//    1. Repository Scan      — extract owner/repo, detect host, derive URL signals
//    2. Manifest Scan        — detect package.json, pyproject.toml, config.json, etc.
//    3. Dependency Analysis  — detect transformers, torch, llama.cpp, n8n, etc.
//    4. Structure Analysis   — detect model files, workflow defs, MCP manifests
//    5. Purpose Detection    — combine all signals into purpose indicators
//    6. Confidence Scoring   — score every InstallTarget (0-100, sums to ~100)
//    7. Recommendation       — pick the highest score as the recommended target
//
//  The user sees the full reasoning (stages + signals + scores) and can override.
//
//  LLM Model Detection: repos with HuggingFace / transformers / tokenizer.json /
//  config.json / generation_config.json / safetensors / GGUF / llama.cpp / MLX /
//  model weights / inference scripts are recognized as LLM Models — they install
//  into Infrastructure → Engines → LLM Registry, NOT App Manager.
//
//  NOTE: This implementation simulates the scan (browser-only — can't clone repos).
//  The signal detection uses URL/name/owner heuristics, but the pipeline stages,
//  scoring model, and override architecture are production-ready. Swapping the
//  heuristic detector for a real clone+read implementation only requires changing
//  `detectRawSignals` — the rest of the pipeline stays identical.

import type { InstallTarget, AnalysisStage, VisualIdentity } from "./types";

// ── All installation targets (ordered for display) ──────────────────────────

export const ALL_TARGETS: InstallTarget[] = [
  "llm-model",
  "runtime-engine",
  "workflow-engine",
  "mcp-server",
  "module",
  "application",
  "skills-package",
  "agent",
  "tool",
];

// ── Signal → Target weight mapping ──────────────────────────────────────────
// Each detected signal contributes its weight to one or more targets. The
// final score for a target is the sum of its signal weights, normalized to a
// percentage across all targets. This makes the scoring transparent and tunable.

const SIGNAL_WEIGHTS: Record<string, Partial<Record<InstallTarget, number>>> = {
  // ── LLM Model signals ──
  "HuggingFace": { "llm-model": 30 },
  "transformers": { "llm-model": 25, "runtime-engine": 5 },
  "tokenizer.json": { "llm-model": 25 },
  "config.json (model)": { "llm-model": 15 },
  "generation_config.json": { "llm-model": 20 },
  "safetensors": { "llm-model": 30 },
  "GGUF": { "llm-model": 25, "runtime-engine": 10 },
  "MLX": { "llm-model": 15, "runtime-engine": 5 },
  "model weights": { "llm-model": 25 },
  "inference scripts": { "llm-model": 10, "runtime-engine": 10 },

  // ── Runtime Engine signals ──
  "llama.cpp": { "runtime-engine": 30, "llm-model": 10 },
  "Ollama": { "runtime-engine": 30 },
  "vLLM": { "runtime-engine": 30 },
  "text-generation-server": { "runtime-engine": 25 },

  // ── Workflow Engine signals ──
  "n8n": { "workflow-engine": 40 },
  "LangFlow": { "workflow-engine": 40 },
  "Node-RED": { "workflow-engine": 35 },
  "workflow definitions": { "workflow-engine": 20 },

  // ── MCP Server signals ──
  "MCP": { "mcp-server": 35 },
  "MCP manifest": { "mcp-server": 30 },

  // ── Skills Package signals ──
  "Skills": { "skills-package": 30 },
  "plugin": { "skills-package": 20 },

  // ── Module signals ──
  "Module": { "module": 25 },
  "connector": { "module": 20 },

  // ── Language / ecosystem signals ──
  "Python": { "llm-model": 5, "runtime-engine": 5, "module": 5, "application": 5 },
  "TypeScript": { "application": 8, "mcp-server": 10, "module": 8 },
  "Node.js": { "application": 10, "module": 10, "mcp-server": 10, "workflow-engine": 5 },
  "Docker": { "workflow-engine": 10, "runtime-engine": 10, "application": 5 },

  // ── Manifest signals ──
  "package.json": { "application": 15, "module": 10, "mcp-server": 8, "skills-package": 8 },
  "pyproject.toml": { "llm-model": 8, "runtime-engine": 8, "module": 5 },
  "requirements.txt": { "llm-model": 8, "runtime-engine": 8, "module": 5 },
  "Dockerfile": { "runtime-engine": 10, "workflow-engine": 10, "application": 5 },
  "README": { "application": 3 },
};

// ── Analysis result ─────────────────────────────────────────────────────────

export interface AnalysisResult {
  stages: AnalysisStage[];
  detectedSignals: string[];
  manifests: string[];
  language: string;
  dependencies: string[];
  scores: Record<InstallTarget, number>;
  detectedType: InstallTarget;
  confidence: "high" | "medium" | "low";
}

// ── Stage 1: Repository Scan ────────────────────────────────────────────────
// Extract owner/repo, detect the host platform, and derive URL-based signals.

function repositoryScan(
  repoUrl: string,
): { owner: string; repo: string; signals: string[]; detail: string } {
  const lowerUrl = repoUrl.toLowerCase();
  const signals: string[] = [];
  const parts = repoUrl.replace(/\.git$/, "").replace(/\/$/, "").split("/");
  const repo = parts[parts.length - 1] || "unknown-repo";
  const owner = parts.length >= 2 ? parts[parts.length - 2] : "";

  // Host detection
  if (/huggingface\.co|hf\.co/.test(lowerUrl)) {
    signals.push("HuggingFace");
  }
  if (/github\.com/.test(lowerUrl)) {
    // github is the default — no special signal, but check owner patterns
  }

  // Owner-based detection (well-known orgs)
  const lowerOwner = owner.toLowerCase();
  if (/n8n-io|n8nio/.test(lowerOwner)) signals.push("n8n");
  if (/langflow-ai|langflowai/.test(lowerOwner)) signals.push("LangFlow");
  if (/ollama/.test(lowerOwner)) signals.push("Ollama");
  if (/vllm-project|vllmproject/.test(lowerOwner)) signals.push("vLLM");
  if (/modelscope|huggingface|deepreinforce|ai-research|ml-research|openai|anthropic|mistralai|garage-bAIndome|eleutherai|meta-llama|facebookresearch/.test(lowerOwner)) {
    signals.push("HuggingFace"); // AI research orgs host models
  }

  // Name-based detection
  const lowerName = repo.toLowerCase();
  if (/n8n/.test(lowerName)) signals.push("n8n");
  if (/langflow/.test(lowerName)) signals.push("LangFlow");
  if (/node-red|nodered/.test(lowerName)) signals.push("Node-RED");
  if (/mcp|model.?context.?protocol/.test(lowerName)) signals.push("MCP");
  if (/ollama/.test(lowerName)) signals.push("Ollama");
  if (/vllm/.test(lowerName)) signals.push("vLLM");
  if (/llama\.cpp|llamacpp/.test(lowerName)) signals.push("llama.cpp");
  if (/skill|tool.?pack|plugin/.test(lowerName)) signals.push("Skills");
  if (/module|integration|connector/.test(lowerName)) signals.push("Module");
  if (/transformers/.test(lowerName)) signals.push("transformers");
  if (/mlx/.test(lowerName)) signals.push("MLX");
  if (/gguf/.test(lowerName)) signals.push("GGUF");
  if (/safetensors/.test(lowerName)) signals.push("safetensors");

  // LLM Model heuristic: AI research org + no app/framework indicators
  const hasAppIndicator = /app|web|ui|dashboard|client|server|api|cli|tool|sdk|frontend|backend/.test(lowerName);
  const hasModelIndicator = /model|gguf|safetensors|weights|checkpoint|transformers|-1$|-2$|-3$|v\d/.test(lowerName);
  if (signals.includes("HuggingFace") && !hasAppIndicator) {
    // Likely a model repo, not an app
    if (!hasModelIndicator) signals.push("model weights");
    signals.push("inference scripts");
  }

  const detail = signals.length > 0
    ? `${owner}/${repo} — detected: ${signals.slice(0, 4).join(", ")}${signals.length > 4 ? "…" : ""}`
    : `${owner}/${repo} — no strong host signals`;

  return { owner, repo, signals, detail };
}

// ── Stage 2: Manifest Scan ──────────────────────────────────────────────────
// Detect manifest files based on the signals from stage 1. Simulated: in
// production this would read the repo's file tree.

function manifestScan(
  signals: string[],
  repoName: string,
): { manifests: string[]; newSignals: string[]; detail: string } {
  const manifests: string[] = ["README.md"];
  const newSignals: string[] = [];

  // Python manifests
  if (signals.some((s) => ["HuggingFace", "transformers", "llama.cpp", "Ollama", "vLLM", "LangFlow", "MLX"].includes(s))) {
    manifests.push("pyproject.toml");
    manifests.push("requirements.txt");
    newSignals.push("Python");
  }

  // Node manifests
  if (signals.some((s) => ["n8n", "MCP", "Node-RED", "Skills", "Module"].includes(s))) {
    manifests.push("package.json");
    newSignals.push("Node.js");
    newSignals.push("TypeScript");
  }

  // Model config manifests (HuggingFace-style)
  if (signals.some((s) => ["HuggingFace", "transformers", "model weights", "safetensors", "GGUF", "MLX"].includes(s))) {
    manifests.push("config.json (model)");
    manifests.push("tokenizer.json");
    manifests.push("generation_config.json");
  }

  // Docker
  if (signals.some((s) => ["n8n", "LangFlow", "Ollama", "vLLM", "Docker"].includes(s))) {
    manifests.push("Dockerfile");
    newSignals.push("Docker");
  }

  // Default: if no language signals yet, assume Node.js (most GitHub repos)
  if (!newSignals.includes("Python") && !newSignals.includes("Node.js")) {
    manifests.push("package.json");
    newSignals.push("Node.js");
  }

  const detail = manifests.length > 1
    ? `Found ${manifests.length} manifests: ${manifests.slice(0, 4).join(", ")}${manifests.length > 4 ? "…" : ""}`
    : "Found: README.md only";

  return { manifests, newSignals, detail };
}

// ── Stage 3: Dependency Analysis ────────────────────────────────────────────
// Detect dependencies based on manifests + signals. Simulated: in production
// this would parse the manifest files.

function dependencyAnalysis(
  signals: string[],
  manifests: string[],
): { dependencies: string[]; newSignals: string[]; detail: string } {
  const deps: string[] = [];
  const newSignals: string[] = [];

  // Python deps
  if (manifests.includes("pyproject.toml") || manifests.includes("requirements.txt")) {
    if (signals.some((s) => ["HuggingFace", "transformers", "model weights"].includes(s))) {
      deps.push("transformers", "torch", "safetensors", "tokenizers", "huggingface-hub");
      newSignals.push("transformers");
    }
    if (signals.includes("llama.cpp")) {
      deps.push("llama-cpp-python");
    }
    if (signals.includes("LangFlow")) {
      deps.push("langflow", "langchain");
    }
    if (deps.length === 0) {
      deps.push("python", "pip");
    }
  }

  // Node deps
  if (manifests.includes("package.json")) {
    if (signals.includes("n8n")) deps.push("n8n-workflow");
    if (signals.includes("MCP")) deps.push("@modelcontextprotocol/sdk");
    if (signals.includes("Node-RED")) deps.push("node-red");
    if (deps.length === 0) {
      deps.push("next", "react");
    }
  }

  const detail = deps.length > 0
    ? `Detected ${deps.length} dependencies: ${deps.slice(0, 4).join(", ")}${deps.length > 4 ? "…" : ""}`
    : "No dependencies detected";

  return { dependencies: deps, newSignals, detail };
}

// ── Stage 4: Project Structure Analysis ─────────────────────────────────────
// Detect file-structure signals (model files, workflow defs, MCP manifests).
// Simulated: in production this would walk the file tree.

function structureAnalysis(
  signals: string[],
): { newSignals: string[]; detail: string } {
  const newSignals: string[] = [];

  // Model weight files
  if (signals.some((s) => ["HuggingFace", "transformers", "model weights"].includes(s))) {
    if (signals.includes("GGUF")) {
      newSignals.push("GGUF");
      newSignals.push("model weights");
    } else if (signals.includes("safetensors")) {
      newSignals.push("safetensors");
      newSignals.push("model weights");
    } else {
      newSignals.push("safetensors");
      newSignals.push("model weights");
    }
  }

  // Workflow definitions
  if (signals.some((s) => ["n8n", "LangFlow", "Node-RED"].includes(s))) {
    newSignals.push("workflow definitions");
  }

  // MCP manifest
  if (signals.includes("MCP")) {
    newSignals.push("MCP manifest");
  }

  const detail = newSignals.length > 0
    ? `Found: ${newSignals.join(", ")}`
    : "No specialized structure detected";

  return { newSignals, detail };
}

// ── Stage 5+6: Confidence Scoring ───────────────────────────────────────────
// Score every InstallTarget based on all detected signals. Returns percentages
// summing to ~100.

function scoreTargets(allSignals: string[]): Record<InstallTarget, number> {
  const rawScores: Record<InstallTarget, number> = {
    "application": 0,
    "module": 0,
    "workflow-engine": 0,
    "runtime-engine": 0,
    "mcp-server": 0,
    "llm-model": 0,
    "skills-package": 0,
    "agent": 0,
    "tool": 0,
  };

  for (const signal of allSignals) {
    const weights = SIGNAL_WEIGHTS[signal];
    if (!weights) continue;
    for (const [target, weight] of Object.entries(weights)) {
      rawScores[target as InstallTarget] += weight;
    }
  }

  // Add a small baseline to "application" so it's never truly 0 (everything
  // COULD be an app). This prevents divide-by-zero and gives a sensible default.
  if (rawScores["application"] === 0) rawScores["application"] = 2;

  // Normalize to percentages
  const total = Object.values(rawScores).reduce((a, b) => a + b, 0);
  const scores = {} as Record<InstallTarget, number>;
  for (const target of ALL_TARGETS) {
    scores[target] = total > 0 ? Math.round((rawScores[target] / total) * 100) : 0;
  }

  return scores;
}

// ── Main entry point ────────────────────────────────────────────────────────

export function analyzeRepository(repoUrl: string): AnalysisResult {
  // Stage 1: Repository Scan
  const { owner, repo, signals: stage1Signals, detail: stage1Detail } = repositoryScan(repoUrl);

  // Stage 2: Manifest Scan
  const { manifests, newSignals: stage2Signals, detail: stage2Detail } = manifestScan(stage1Signals, repo);

  // Stage 3: Dependency Analysis
  const { dependencies, newSignals: stage3Signals, detail: stage3Detail } = dependencyAnalysis(
    [...stage1Signals, ...stage2Signals],
    manifests,
  );

  // Stage 4: Structure Analysis
  const { newSignals: stage4Signals, detail: stage4Detail } = structureAnalysis(
    [...stage1Signals, ...stage2Signals, ...stage3Signals],
  );

  // Stage 5: Purpose Detection — combine all signals (including manifest names,
  // which carry their own weights in SIGNAL_WEIGHTS)
  const allSignals = [...new Set([
    ...stage1Signals,
    ...stage2Signals,
    ...stage3Signals,
    ...stage4Signals,
    ...manifests,
  ])];

  // Stage 6: Confidence Scoring
  const scores = scoreTargets(allSignals);

  // Stage 7: Recommendation — pick the highest score
  const sortedTargets = ALL_TARGETS
    .map((t) => ({ target: t, score: scores[t] }))
    .sort((a, b) => b.score - a.score);
  const detectedType = sortedTargets[0].target;
  const topScore = sortedTargets[0].score;
  const confidence: "high" | "medium" | "low" =
    topScore >= 60 ? "high" : topScore >= 30 ? "medium" : "low";

  // Detect primary language
  const language =
    allSignals.includes("Python") ? "Python" :
    allSignals.includes("TypeScript") ? "TypeScript" :
    allSignals.includes("Node.js") ? "JavaScript" :
    "Unknown";

  // Build the stage log
  const stages: AnalysisStage[] = [
    { name: "Repository Scan", detail: stage1Detail, signals: stage1Signals },
    { name: "Manifest Scan", detail: stage2Detail, signals: stage2Signals },
    { name: "Dependency Analysis", detail: stage3Detail, signals: stage3Signals },
    { name: "Structure Analysis", detail: stage4Detail, signals: stage4Signals },
    { name: "Purpose Detection", detail: `${allSignals.length} signals combined`, signals: allSignals },
    { name: "Confidence Scoring", detail: `Top: ${detectedType.replace(/-/g, " ")} (${topScore}%)`, signals: [] },
    { name: "Recommendation", detail: `Install as ${detectedType.replace(/-/g, " ")}`, signals: [] },
  ];

  return {
    stages,
    detectedSignals: allSignals,
    manifests,
    language,
    dependencies,
    scores,
    detectedType,
    confidence,
  };
}

// ── Install action descriptions per target ──────────────────────────────────

export const INSTALL_ACTIONS: Record<InstallTarget, string> = {
  "application": "Register as an App in the App Manager (appears in Workspace → Apps).",
  "module": "Install as a Module via the agentic installer pipeline (appears in Infrastructure → Modules).",
  "workflow-engine": "Register as a Workflow Engine (appears in Infrastructure → Engines → Workflow Engines).",
  "runtime-engine": "Add as a Runtime Engine (appears in Infrastructure → Engines → Runtime Engines).",
  "mcp-server": "Register as an MCP Server (appears in Infrastructure → Engines → MCP Registry).",
  "llm-model": "Register as an LLM Model in the LLM Registry (appears in Infrastructure → Engines → LLM Registry).",
  "skills-package": "Install as a Skill in the Skills Registry (appears in Workspace → Skills & Tools → Skills tab).",
  "agent": "Register as an Agent (appears in Infrastructure → Agents).",
  "tool": "Install as a Tool in the Tools Registry (appears in Workspace → Skills & Tools → Tools tab).",
};

// ════════════════════════════════════════════════════════════════════════════
//  Visual Identity Suggestion
// ════════════════════════════════════════════════════════════════════════════
//
//  This is a PURE ADDITIVE function — it does NOT modify the analyzer's
//  classification, scoring, or recommendation logic. It only derives a
//  suggested VisualIdentity (icon, color, badge, category) from the
//  detected target + signals, so the user can review/customize before install.
//
//  Icon detection: in production, this would scan the repo for logo.png,
//  favicon.ico, icon.svg, etc. In the browser sandbox, we use the detected
//  target + signals to pick a sensible default Lucide icon. The user can
//  always override.
//
//  Color detection: in production, this would extract a brand color from the
//  repo's logo/README banner. Here we use the category's default color.

// ── Per-target default visual identity ──────────────────────────────────────
// Each target maps to: default glyph (emoji — same canonical format as Agent
// Forge), default accent color (EXTENDED_PALETTE token), default badge,
// default category label. The user can override every field in the Visual
// Identity step before install.

export const TARGET_VISUAL_DEFAULTS: Record<
  InstallTarget,
  { glyph: string; accentColor: string; badge: string; category: string }
> = {
  "application": {
    glyph: "📦",
    accentColor: "axiom-violet",
    badge: "APP",
    category: "Application",
  },
  "module": {
    glyph: "🧩",
    accentColor: "axiom-amber",
    badge: "MODULE",
    category: "Module",
  },
  "workflow-engine": {
    glyph: "⚡",
    accentColor: "axiom-rose",
    badge: "ENGINE",
    category: "Workflow Engine",
  },
  "runtime-engine": {
    glyph: "⚙",
    accentColor: "axiom-amber",
    badge: "ENGINE",
    category: "Runtime Engine",
  },
  "mcp-server": {
    glyph: "🔌",
    accentColor: "axiom-violet",
    badge: "MCP",
    category: "MCP Server",
  },
  "llm-model": {
    glyph: "🧠",
    accentColor: "axiom-violet",
    badge: "LLM",
    category: "LLM Provider",
  },
  "skills-package": {
    glyph: "⚒",
    accentColor: "axiom-emerald",
    badge: "SKILL",
    category: "Skill",
  },
  "agent": {
    glyph: "🤖",
    accentColor: "axiom-emerald",
    badge: "AGENT",
    category: "Agent",
  },
  "tool": {
    glyph: "⚙",
    accentColor: "axiom-cyan",
    badge: "TOOL",
    category: "Tool",
  },
};

// ── Category → InstallTarget mapping ────────────────────────────────────────
// The category IS the installation destination. There is no separate mapping
// logic elsewhere — the selected category directly determines which registry
// the subsystem is installed into. This is the single source of truth.
//
// Valid categories (each maps 1:1 to a real Infrastructure registry):
//   Application     → App Manager
//   Module          → Modules
//   Runtime Engine  → Engines → Runtime Engines
//   Workflow Engine → Engines → Workflow Engines
//   LLM Provider    → Engines → LLM Registry
//   MCP Server      → Engines → MCP Registry
//   Skill           → Skills Registry
//   Tool            → Tools Registry
//   Agent           → Agents

export const CATEGORY_TO_TARGET: Record<string, InstallTarget> = {
  // Canonical categories — each maps to exactly ONE real Infrastructure registry.
  "Application": "application",
  "Module": "module",
  "Runtime Engine": "runtime-engine",
  "Workflow Engine": "workflow-engine",
  "LLM Provider": "llm-model",
  "MCP Server": "mcp-server",
  "Skill": "skills-package",
  "Tool": "tool",
  "Agent": "agent",
  // Aliases (user-friendly labels that map to the same targets)
  "LLM": "llm-model",
  "MCP": "mcp-server",
};

// ── Owner → brand color + glyph hints ───────────────────────────────────────
// Well-known orgs get their brand color + a more specific glyph. This uses
// the SAME canonical glyph format as Agent Forge (emoji strings).

const OWNER_BRAND_HINTS: Record<string, { accentColor?: string; glyph?: string; badge?: string }> = {
  "openai": { accentColor: "axiom-emerald", glyph: "✦" },
  "anthropic": { accentColor: "axiom-amber", glyph: "🧠" },
  "mistralai": { accentColor: "axiom-amber", glyph: "🌬" },
  "meta-llama": { accentColor: "axiom-cyan", glyph: "🦙" },
  "facebookresearch": { accentColor: "axiom-cyan", glyph: "🧠" },
  "google": { accentColor: "axiom-amber", glyph: "✦" },
  "huggingface": { accentColor: "axiom-amber", glyph: "🤗" },
  "n8n-io": { accentColor: "axiom-rose", glyph: "⚡" },
  "ollama": { accentColor: "axiom-amber", glyph: "🦙" },
  "vllm-project": { accentColor: "axiom-cyan", glyph: "⚙" },
  "github": { accentColor: "axiom-violet", glyph: "🐙" },
};

/**
 * Derive a suggested VisualIdentity from the analysis result. PURE function —
 * does not modify the AnalysisResult. The user can override every field in
 * the Visual Identity step before install.
 *
 * The effective target is `userOverride ?? detectedType` — pass that in.
 */
export function suggestVisualIdentity(
  result: AnalysisResult,
  repoUrl: string | undefined,
  displayName: string,
  description: string,
  userOverride: InstallTarget | null,
): VisualIdentity {
  const effectiveTarget: InstallTarget = userOverride ?? result.detectedType;
  const defaults = TARGET_VISUAL_DEFAULTS[effectiveTarget];

  // Extract owner from repoUrl (if present) for brand hints
  let owner = "";
  if (repoUrl) {
    const parts = repoUrl.replace(/\.git$/, "").replace(/\/$/, "").split("/");
    owner = parts.length >= 2 ? parts[parts.length - 2].toLowerCase() : "";
  }
  const brandHint = OWNER_BRAND_HINTS[owner] ?? {};

  return {
    displayName,
    description,
    category: defaults.category,
    glyph: brandHint.glyph ?? defaults.glyph,
    accentColor: brandHint.accentColor ?? defaults.accentColor,
    badge: brandHint.badge ?? defaults.badge,
  };
}
