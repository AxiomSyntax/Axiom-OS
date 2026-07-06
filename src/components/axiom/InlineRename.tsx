// ════════════════════════════════════════════════════════════════════════════
//  InlineRename — DEPRECATED.
//
//  This file is kept only for back-compat. The canonical rename component is
//  `RenameableText` in `./RenameableText.tsx`. It supports:
//    • Double-click to edit
//    • Right-click → Rename context menu
//    • Enter = Save, Escape = Cancel, click outside (blur) = Save
//
//  This legacy wrapper re-exports InlineRename with single-click-to-edit
//  behavior (matching the old API). New code should use RenameableText directly.
// ════════════════════════════════════════════════════════════════════════════

export { InlineRename } from "./RenameableText";
