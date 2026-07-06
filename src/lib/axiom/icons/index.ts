// Barrel export for the asset provider system
export * from "./types";
export { axiomProvider, AXIOM_GLYPHS } from "./axiom-provider";
export {
  workspaceProvider,
  loadWorkspaceAssetIndex,
  saveWorkspaceAsset,
  deleteWorkspaceAsset,
  renameWorkspaceAsset,
  moveWorkspaceAsset,
  onWorkspaceAssetsChanged,
  listWorkspaceAssetNames,
  getWorkspaceAssetSvg,
  listFolders,
  listAssetsInFolder,
  listSubfolders,
  getFolder,
  getFileName,
  joinPath,
  useWorkspaceAssets,
} from "./workspace-provider";
export { registerAssetProvider, getProvider, listLibraries, listAvailableLibraries, GlyphRenderer, setLucideResolver, invalidateIconCache } from "./registry";
