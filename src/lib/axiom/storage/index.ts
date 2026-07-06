// ════════════════════════════════════════════════════════════════════════════
//  Workspace Storage Service — public API barrel
// ════════════════════════════════════════════════════════════════════════════
//
//  Import everything from this barrel:
//    import { StorageService, loadWorkspaceConfig, ... } from "@/lib/axiom/storage";
//
//  Applications use the StorageService API (saveProject, loadProject, etc.)
//  and never touch the provider directly.

export * from "./types";
export * from "./service";
export * from "./local-provider";
