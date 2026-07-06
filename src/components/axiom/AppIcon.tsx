"use client";

// ════════════════════════════════════════════════════════════════════════════
//  AppIcon.tsx — Minimal Lucide component map + GlyphRenderer re-export
// ════════════════════════════════════════════════════════════════════════════
//
//  This file imports ONLY the ~34 Lucide icons that are actually USED as
//  defaults somewhere in Axiom OS (seed data, store defaults, auto-forge
//  rules, profile/app fallbacks). These are functional defaults — they are
//  NOT browsable in the picker.
//
//  When a user wants a new Lucide icon, they open lucide.dev, copy the SVG,
//  and paste it into Axiom's "External Libraries" tab. The SVG is stored
//  in Workspace Assets and becomes permanently available.

import {
  AppWindow, AudioWaveform, BarChart3, Bot, BookOpen, Boxes, Brain, Camera,
  Cloud, Code2, Database, DollarSign, FileText, FlaskConical, Globe, Image,
  LineChart, Lock, Mail, MessageSquare, Mic, Music, Network, Package, Rocket,
  Settings, Shield, ShoppingCart, ShoppingBag, User, Video, Volume2, Workflow,
  Wrench,
  type LucideIcon,
} from "lucide-react";

const LUCIDE_MAP: Record<string, LucideIcon> = {
  AppWindow, AudioWaveform, BarChart3, Bot, BookOpen, Boxes, Brain, Camera,
  Cloud, Code2, Database, DollarSign, FileText, FlaskConical, Globe, Image,
  LineChart, Lock, Mail, MessageSquare, Mic, Music, Network, Package, Rocket,
  Settings, Shield, ShoppingCart, ShoppingBag, User, Video, Volume2, Workflow,
  Wrench,
};

/** Resolve a Lucide icon name to a component. Returns null if not found. */
export function resolveLucideIcon(name: string): LucideIcon | null {
  return LUCIDE_MAP[name] ?? null;
}

import { setLucideResolver } from "@/lib/axiom/icons/registry";
setLucideResolver(resolveLucideIcon);

// ── AppGlyph — static Lucide renderer (back-compat) ─────────────────────────

export function AppGlyph({
  iconName,
  className,
}: {
  iconName?: string;
  className?: string;
}) {
  const Icon = (iconName && LUCIDE_MAP[iconName]) || AppWindow;
  return <Icon className={className} />;
}

// ── GlyphRenderer — unified renderer ────────────────────────────────────────

export { GlyphRenderer } from "@/lib/axiom/icons/registry";

// ── Default glyph constants ─────────────────────────────────────────────────

export const DEFAULT_PROFILE_GLYPH = "User";
export const DEFAULT_APP_GLYPH = "Package";

export default AppGlyph;
