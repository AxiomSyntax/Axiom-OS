"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Package, Globe, Loader2, Rocket, AlertTriangle, Check, Wand2, Hash, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAxiom } from "@/lib/axiom/store";
import type { PublishedAppBlueprint } from "@/lib/axiom/types";
import { GlyphRenderer } from "@/components/axiom/AppIcon";
import { AssetPicker } from "@/components/axiom/AssetPicker";
import { EXTENDED_PALETTE, validateHex } from "@/lib/axiom/forge-auto";

interface PublishAppModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string | null;
}

const INPUT_CLS =
  "w-full bg-axiom-void/60 border border-axiom-edge/40 rounded-md px-3 py-2 text-sm text-axiom-text placeholder:text-axiom-dim/50 focus:outline-none focus:border-axiom-edge/70 transition-colors";

const LABEL_CLS =
  "block text-[10px] font-semibold tracking-wider uppercase text-axiom-dim mb-1.5";

export default function PublishAppModal({ open, onClose, workspaceId }: PublishAppModalProps) {
  const { publishWorkspace, devlabWorkspaces } = useAxiom();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [blueprint, setBlueprint] = useState<PublishedAppBlueprint | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [githubRepoUrl, setGithubRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Glyph & Color state — glyph now stores a System Glyph (Lucide icon name)
  const [glyph, setGlyph] = useState("Package");
  const [colorToken, setColorToken] = useState("axiom-emerald");
  const [customHex, setCustomHex] = useState("");
  const [customHexError, setCustomHexError] = useState(false);
  const [useCustomHex, setUseCustomHex] = useState(false);

  const currentWorkspace = devlabWorkspaces.find((w) => w.id === workspaceId);
  const fileCount = currentWorkspace?.files?.length ?? 0;

  const activeColor = EXTENDED_PALETTE.find((c) => c.token === colorToken) ?? EXTENDED_PALETTE[0];

  // ── Auto-Forge — pick an icon by description keyword ──
  const handleAutoForge = () => {
    const desc = `${name} ${description}`.trim().toLowerCase();
    if (!desc) return;
    const rules: Array<[string, string]> = [
      ["app", "AppWindow"],
      ["application", "AppWindow"],
      ["code", "Code2"],
      ["coding", "Code2"],
      ["dev", "Code2"],
      ["develop", "Code2"],
      ["brain", "Brain"],
      ["agent", "Bot"],
      ["bot", "Bot"],
      ["music", "Music"],
      ["audio", "Volume2"],
      ["sound", "Volume2"],
      ["voice", "Mic"],
      ["video", "Video"],
      ["movie", "Film"],
      ["film", "Film"],
      ["chart", "BarChart3"],
      ["graph", "BarChart3"],
      ["analytics", "LineChart"],
      ["data", "Database"],
      ["database", "Database"],
      ["mail", "Mail"],
      ["email", "Mail"],
      ["message", "MessageSquare"],
      ["chat", "MessageSquare"],
      ["server", "Server"],
      ["infra", "Server"],
      ["cloud", "Cloud"],
      ["network", "Network"],
      ["globe", "Globe"],
      ["web", "Globe"],
      ["shop", "ShoppingCart"],
      ["commerce", "ShoppingBag"],
      ["store", "ShoppingBag"],
      ["money", "DollarSign"],
      ["finance", "DollarSign"],
      ["camera", "Camera"],
      ["image", "Image"],
      ["photo", "Image"],
      ["book", "BookOpen"],
      ["doc", "FileText"],
      ["document", "FileText"],
      ["note", "FileText"],
      ["rocket", "Rocket"],
      ["launch", "Rocket"],
      ["tool", "Wrench"],
      ["setting", "Settings"],
      ["config", "Settings"],
      ["lab", "FlaskConical"],
      ["experiment", "FlaskConical"],
      ["workflow", "Workflow"],
      ["process", "Workflow"],
      ["shield", "Shield"],
      ["security", "Shield"],
      ["lock", "Lock"],
      ["package", "Package"],
      ["module", "Boxes"],
    ];
    const match = rules.find(([kw]) => desc.includes(kw));
    setGlyph(match ? match[1] : "Package");
  };

  // ── Custom Hex Handler ──
  const handleCustomHexChange = (value: string) => {
    const cleaned = value.replace(/[^#0-9A-Fa-f]/g, "");
    setCustomHex(cleaned);
    if (cleaned.length >= 7) {
      const validated = validateHex(cleaned);
      if (validated) {
        setCustomHexError(false);
        setUseCustomHex(true);
        document.documentElement.style.setProperty("--axiom-custom", validated);
      } else {
        setCustomHexError(true);
      }
    } else {
      setCustomHexError(false);
    }
  };

  function resetAndClose() {
    setStep(1);
    setBlueprint(null);
    setName("");
    setDescription("");
    setUrl("");
    setGithubRepoUrl("");
    setGlyph("Package");
    setColorToken("axiom-emerald");
    setCustomHex("");
    setCustomHexError(false);
    setUseCustomHex(false);
    setLoading(false);
    setError(null);
    onClose();
  }

  function handleSelectBlueprint(b: PublishedAppBlueprint) {
    setBlueprint(b);
    setName(currentWorkspace?.name ?? "");
    setError(null);
    setStep(2);
  }

  async function handlePublish() {
    if (!workspaceId || !blueprint) return;
    setLoading(true);
    setError(null);

    try {
      await publishWorkspace(workspaceId, {
        blueprint,
        name,
        description,
        url: blueprint === "external" ? url : undefined,
        githubRepoUrl: blueprint === "external" ? githubRepoUrl : undefined,
        glyph,
        color: useCustomHex ? customHex : colorToken,
        customColor: useCustomHex,
      });
      resetAndClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.toLowerCase().includes("already published")) {
        setError("Workspace already published");
      } else {
        setError(message || "Publish failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  const isPublishDisabled =
    loading ||
    !name.trim() ||
    (blueprint === "external" && !url.trim());

  // ── Step indicator ──
  const stepLabels = ["Blueprint", "Configure", "Review"];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={resetAndClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative z-10 w-full max-w-xl mx-4 bg-axiom-deep border border-axiom-edge/60 rounded-xl shadow-2xl shadow-black/40"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-axiom-edge/40">
              <div className="flex items-center gap-2.5">
                <Rocket className="w-4.5 h-4.5 text-axiom-cyan" />
                <h2 className="text-sm font-semibold tracking-wide text-axiom-text">
                  Publish App
                </h2>
              </div>
              <button
                onClick={resetAndClose}
                className="p-1 rounded-md text-axiom-dim hover:text-axiom-text hover:bg-axiom-void/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-1 px-5 pt-3 pb-1">
              {stepLabels.map((label, i) => {
                const stepNum = (i + 1) as 1 | 2 | 3;
                const isActive = step === stepNum;
                const isPast = step > stepNum;
                return (
                  <div key={label} className="flex items-center gap-1.5 flex-1">
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border transition-colors",
                        isActive
                          ? "border-axiom-cyan/60 bg-axiom-cyan/15 text-axiom-cyan"
                          : isPast
                            ? "border-axiom-emerald/40 bg-axiom-emerald/10 text-axiom-emerald"
                            : "border-axiom-edge/40 text-axiom-dim",
                      )}
                    >
                      {isPast ? <Check className="w-2.5 h-2.5" /> : stepNum}
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-medium tracking-wide",
                        isActive ? "text-axiom-text" : "text-axiom-dim/60",
                      )}
                    >
                      {label}
                    </span>
                    {i < stepLabels.length - 1 && (
                      <div
                        className={cn(
                          "flex-1 h-px mx-1.5",
                          isPast ? "bg-axiom-emerald/30" : "bg-axiom-edge/30",
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Body */}
            <div className="px-5 py-4">
              <AnimatePresence mode="wait">
                {/* ─── Step 1: Blueprint Selection ─── */}
                {step === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.2 }}
                  >
                    <p className="text-xs text-axiom-dim mb-4">
                      Choose how your app will be deployed within Axiom OS.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Integrated Module */}
                      <button
                        onClick={() => handleSelectBlueprint("integrated")}
                        className="group text-left border border-axiom-edge/40 rounded-lg p-4 hover:border-axiom-emerald/50 transition-all duration-200 cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className="flex items-center justify-center w-9 h-9 rounded-md bg-axiom-emerald/10">
                            <Package className="w-4.5 h-4.5 text-axiom-emerald" />
                          </div>
                          <span className="text-xs font-bold tracking-wider text-axiom-emerald uppercase">
                            Integrated Module
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-axiom-dim">
                          Packages the code as a native OS extension. Injects into the sidebar for direct navigation.
                        </p>
                      </button>

                      {/* External Standalone */}
                      <button
                        onClick={() => handleSelectBlueprint("external")}
                        className="group text-left border border-axiom-edge/40 rounded-lg p-4 hover:border-axiom-cyan/50 transition-all duration-200 cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className="flex items-center justify-center w-9 h-9 rounded-md bg-axiom-cyan/10">
                            <Globe className="w-4.5 h-4.5 text-axiom-cyan" />
                          </div>
                          <span className="text-xs font-bold tracking-wider text-axiom-cyan uppercase">
                            External Standalone
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-axiom-dim">
                          Binds the app to a GitHub repository and production URL. Opens in a sandboxed overlay.
                        </p>
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ─── Step 2: Configuration ─── */}
                {step === 2 && blueprint && (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    {/* Selected blueprint badge */}
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border",
                          blueprint === "integrated"
                            ? "border-axiom-emerald/40 bg-axiom-emerald/10 text-axiom-emerald"
                            : "border-axiom-cyan/40 bg-axiom-cyan/10 text-axiom-cyan",
                        )}
                      >
                        {blueprint === "integrated" ? (
                          <Package className="w-3 h-3" />
                        ) : (
                          <Globe className="w-3 h-3" />
                        )}
                        {blueprint === "integrated" ? "Integrated Module" : "External Standalone"}
                      </div>
                      <Check className="w-3.5 h-3.5 text-axiom-dim" />
                    </div>

                    {/* App Name */}
                    <div>
                      <label className={LABEL_CLS}>App Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="my-awesome-app"
                        className={INPUT_CLS}
                      />
                    </div>

                    {/* Description — textarea */}
                    <div>
                      <label className={LABEL_CLS}>
                        Description <span className="text-axiom-dim/40">(optional)</span>
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe your module — supports markdown, linebreaks, and whitespace…"
                        rows={4}
                        className={cn(INPUT_CLS, "resize-y min-h-[4rem]")}
                      />
                    </div>

                    {/* ── Visual Branding ── */}
                    <div className="space-y-3">
                      {/* Auto-Forge row */}
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-semibold tracking-wider uppercase text-axiom-dim flex items-center gap-1.5">
                          <GlyphRenderer glyph={glyph} className="w-3 h-3" />
                          Visual Branding
                        </label>
                        <button
                          onClick={handleAutoForge}
                          disabled={!name.trim() && !description.trim()}
                          className="px-2.5 py-1 rounded-md text-[10px] font-medium border border-axiom-neon-lime/40 bg-axiom-neon-lime/10 text-axiom-neon-lime hover:bg-axiom-neon-lime/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
                        >
                          <Wand2 className="w-3 h-3" /> Auto-Forge
                        </button>
                      </div>

                      {/* Extended Accent Palette — compact 2 rows */}
                      <div className="p-2.5 rounded-lg bg-axiom-deep/40 border border-axiom-edge/30">
                        <label className="text-[9px] uppercase tracking-wider text-axiom-dim/70 font-medium flex items-center gap-1.5 mb-2">
                          <span className="w-2 h-2 rounded-full bg-gradient-to-r from-axiom-cyan via-axiom-violet to-axiom-ruby" />
                          Accent Palette
                        </label>
                        <div className="grid grid-cols-6 gap-1.5">
                          {EXTENDED_PALETTE.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => {
                                setColorToken(c.token);
                                setUseCustomHex(false);
                              }}
                              className={cn(
                                "group relative flex items-center gap-1.5 py-1.5 px-1.5 rounded-md border transition-all",
                                colorToken === c.token && !useCustomHex
                                  ? "border-white/20 bg-white/5"
                                  : "border-axiom-edge/30 hover:border-axiom-edge/60 hover:bg-white/3",
                              )}
                              style={
                                colorToken === c.token && !useCustomHex
                                  ? { boxShadow: `0 0 12px -4px ${c.hex}60` }
                                  : {}
                              }
                            >
                              <div
                                className="w-4 h-4 rounded-sm border border-white/10 shrink-0"
                                style={{ backgroundColor: c.hex }}
                              />
                              <span
                                className={cn(
                                  "text-[9px] leading-none truncate",
                                  colorToken === c.token && !useCustomHex
                                    ? "text-axiom-text"
                                    : "text-axiom-dim",
                                )}
                              >
                                {c.label}
                              </span>
                              {colorToken === c.token && !useCustomHex && (
                                <Check className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-axiom-neon-lime text-axiom-void p-0.5" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom Hex Input — compact inline */}
                      <div className="flex items-center gap-2">
                        <label className="text-[9px] uppercase tracking-wider text-axiom-dim/70 font-medium flex items-center gap-1 shrink-0">
                          <Hash className="w-2.5 h-2.5" />
                          Custom Hex
                        </label>
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-axiom-dim text-xs">#</span>
                          <input
                            value={customHex.replace("#", "")}
                            onChange={(e) => handleCustomHexChange("#" + e.target.value)}
                            placeholder="FF5733"
                            maxLength={7}
                            className={cn(
                              "w-full bg-axiom-void/60 border rounded-md px-2.5 py-1.5 pl-7 text-xs font-mono text-axiom-text placeholder:text-axiom-dim/40 focus:outline-none transition-colors",
                              customHexError
                                ? "border-axiom-ruby/60 focus:border-axiom-ruby"
                                : "border-axiom-edge/40 focus:border-axiom-edge/70",
                            )}
                          />
                        </div>
                        {/* Live preview swatch */}
                        <div
                          className="w-7 h-7 rounded-md border border-white/10 shrink-0 transition-colors"
                          style={{
                            backgroundColor: validateHex(customHex) ?? "transparent",
                            boxShadow: validateHex(customHex)
                              ? `0 0 12px -4px ${customHex}50`
                              : undefined,
                          }}
                        />
                        {validateHex(customHex) && (
                          <button
                            onClick={() => setUseCustomHex(true)}
                            className={cn(
                              "px-2 py-1.5 rounded-md text-[10px] border font-medium transition-all shrink-0",
                              useCustomHex
                                ? "bg-axiom-neon-lime/15 border-axiom-neon-lime/40 text-axiom-neon-lime"
                                : "border-axiom-edge/40 text-axiom-dim hover:text-axiom-text hover:border-axiom-edge/60",
                            )}
                          >
                            {useCustomHex ? "Active" : "Apply"}
                          </button>
                        )}
                      </div>
                      {customHexError && (
                        <p className="text-[9px] text-axiom-ruby -mt-1">
                          Invalid hex code. Must be 6 characters (0-9, A-F).
                        </p>
                      )}

                      {/* Glyph Selection — provider-based picker (Axiom, Lucide, Phosphor, etc.) */}
                      <div className="p-2.5 rounded-lg bg-axiom-deep/40 border border-axiom-edge/30">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[9px] uppercase tracking-wider text-axiom-dim/70 font-medium flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3" />
                            Glyph Selection
                          </label>
                        </div>
                        <AssetPicker
                          selectedGlyph={glyph}
                          onSelect={setGlyph}
                          accentColor="axiom-neon-lime"
                          compact
                        />
                      </div>
                    </div>

                    {/* ── External-only fields ── */}
                    {blueprint === "external" && (
                      <div className="space-y-3 pt-1 border-t border-axiom-edge/30">
                        {/* GitHub Repository URL */}
                        <div>
                          <label className={LABEL_CLS}>
                            GitHub Repository URL{" "}
                            <span className="text-axiom-dim/40 normal-case tracking-normal">(optional)</span>
                          </label>
                          <input
                            type="url"
                            value={githubRepoUrl}
                            onChange={(e) => setGithubRepoUrl(e.target.value)}
                            placeholder="https://github.com/username/repo"
                            className={INPUT_CLS}
                          />
                        </div>

                        {/* Production Live URL */}
                        <div>
                          <label className={LABEL_CLS}>Production Live URL</label>
                          <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="Deployed via any CI/CD hook — Vercel, Netlify, custom server…"
                            className={INPUT_CLS}
                          />
                        </div>
                      </div>
                    )}

                    {/* File count / context note */}
                    <div className="flex items-center gap-1.5 px-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-axiom-amber/70" />
                      <span className="text-[11px] text-axiom-dim">
                        {blueprint === "integrated"
                          ? `${fileCount} ${fileCount === 1 ? "file" : "files"} will be compiled locally`
                          : `${fileCount} ${fileCount === 1 ? "file" : "files"} will be compiled`}
                      </span>
                    </div>

                    {/* Error message */}
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-2.5 p-3 rounded-md bg-axiom-amber/5 border border-axiom-amber/30"
                      >
                        <AlertTriangle className="w-4 h-4 text-axiom-amber mt-0.5 shrink-0" />
                        <p className="text-xs text-axiom-amber leading-relaxed">{error}</p>
                      </motion.div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2.5 pt-1">
                      <button
                        onClick={() => {
                          setError(null);
                          setStep(1);
                        }}
                        disabled={loading}
                        className="px-3.5 py-2 text-xs font-medium text-axiom-dim hover:text-axiom-text rounded-md border border-axiom-edge/30 hover:border-axiom-edge/50 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => {
                          setError(null);
                          setStep(3);
                        }}
                        disabled={loading || !name.trim()}
                        className="px-4 py-2 text-xs font-medium text-axiom-text rounded-md border border-axiom-edge/40 hover:border-axiom-edge/60 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                      >
                        Review
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ─── Step 3: Review & Publish ─── */}
                {step === 3 && blueprint && (
                  <motion.div
                    key="step-3"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <p className="text-xs text-axiom-dim">
                      Review your module configuration before publishing.
                    </p>

                    {/* Blueprint badge */}
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border",
                          blueprint === "integrated"
                            ? "border-axiom-emerald/40 bg-axiom-emerald/10 text-axiom-emerald"
                            : "border-axiom-cyan/40 bg-axiom-cyan/10 text-axiom-cyan",
                        )}
                      >
                        {blueprint === "integrated" ? (
                          <Package className="w-3 h-3" />
                        ) : (
                          <Globe className="w-3 h-3" />
                        )}
                        {blueprint === "integrated" ? "Integrated Module" : "External Standalone"}
                      </div>
                    </div>

                    {/* Name + Description */}
                    <div className="p-3 rounded-lg bg-axiom-void/40 border border-axiom-edge/30 space-y-2">
                      <h3 className="text-sm font-semibold text-axiom-text">{name || "Untitled Module"}</h3>
                      {description.trim() && (
                        <p className="text-xs text-axiom-dim leading-relaxed whitespace-pre-line">
                          {description.split("\n").slice(0, 2).join("\n")}
                          {description.split("\n").length > 2 && (
                            <span className="text-axiom-dim/50">…</span>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Glyph + Color preview */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-axiom-void/40 border border-axiom-edge/30">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center border border-white/10"
                        style={{
                          backgroundColor: useCustomHex
                            ? validateHex(customHex) ?? activeColor.hex
                            : activeColor.hex,
                          boxShadow: `0 0 16px -4px ${useCustomHex ? (validateHex(customHex) ?? activeColor.hex) : activeColor.hex}50`,
                        }}
                      >
                        <GlyphRenderer glyph={glyph} className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-axiom-dim font-medium">
                          Branding
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-axiom-text flex items-center gap-1">
                            <GlyphRenderer glyph={glyph} className="w-3 h-3" />
                            <span className="font-mono">{glyph}</span>
                          </span>
                          <span className="text-axiom-dim/30">·</span>
                          <div className="flex items-center gap-1">
                            <div
                              className="w-3 h-3 rounded-sm border border-white/10"
                              style={{
                                backgroundColor: useCustomHex
                                  ? validateHex(customHex) ?? activeColor.hex
                                  : activeColor.hex,
                              }}
                            />
                            <span className="text-xs text-axiom-dim">
                              {useCustomHex ? customHex : activeColor.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* External URLs */}
                    {blueprint === "external" && (
                      <div className="p-3 rounded-lg bg-axiom-void/40 border border-axiom-edge/30 space-y-2">
                        {githubRepoUrl.trim() && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase tracking-wider text-axiom-dim font-medium w-20 shrink-0">
                              GitHub
                            </span>
                            <span className="text-xs text-axiom-text truncate">
                              {githubRepoUrl}
                            </span>
                          </div>
                        )}
                        {url.trim() && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase tracking-wider text-axiom-dim font-medium w-20 shrink-0">
                              Live URL
                            </span>
                            <span className="text-xs text-axiom-text truncate">
                              {url}
                            </span>
                          </div>
                        )}
                        {!githubRepoUrl.trim() && !url.trim() && (
                          <p className="text-[11px] text-axiom-dim/50 italic">
                            No URLs configured
                          </p>
                        )}
                      </div>
                    )}

                    {/* File count */}
                    <div className="flex items-center gap-1.5 px-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-axiom-amber/70" />
                      <span className="text-[11px] text-axiom-dim">
                        {fileCount} {fileCount === 1 ? "file" : "files"} will be compiled
                      </span>
                    </div>

                    {/* Error message */}
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-2.5 p-3 rounded-md bg-axiom-amber/5 border border-axiom-amber/30"
                      >
                        <AlertTriangle className="w-4 h-4 text-axiom-amber mt-0.5 shrink-0" />
                        <p className="text-xs text-axiom-amber leading-relaxed">{error}</p>
                      </motion.div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2.5 pt-1">
                      <button
                        onClick={() => {
                          setError(null);
                          setStep(2);
                        }}
                        disabled={loading}
                        className="px-3.5 py-2 text-xs font-medium text-axiom-dim hover:text-axiom-text rounded-md border border-axiom-edge/30 hover:border-axiom-edge/50 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                      >
                        Back
                      </button>
                      <button
                        onClick={handlePublish}
                        disabled={isPublishDisabled}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md bg-axiom-emerald/20 border border-axiom-emerald/50 text-axiom-emerald hover:bg-axiom-emerald/30 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                      >
                        {loading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Rocket className="w-3.5 h-3.5" />
                        )}
                        {loading ? "Publishing…" : "Publish"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}