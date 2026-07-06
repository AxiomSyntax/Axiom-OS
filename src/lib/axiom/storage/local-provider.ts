"use client";

import type { StorageProvider, StorageNamespace } from "./types";

const KEY_PREFIX = "axiom";
const NS_SEPARATOR = ":";
const NS_MANIFEST_KEY = `${KEY_PREFIX}${NS_SEPARATOR}__namespaces__`;
const KEYS_SUFFIX = "__keys__";

function nsKey(namespace: StorageNamespace, key: string): string {
  return `${KEY_PREFIX}${NS_SEPARATOR}${namespace}${NS_SEPARATOR}${key}`;
}

function nsManifestKey(namespace: StorageNamespace): string {
  return `${KEY_PREFIX}${NS_SEPARATOR}${namespace}${NS_SEPARATOR}${KEYS_SUFFIX}`;
}

function readNamespaceManifest(): Set<string> {
  try {
    const raw = localStorage.getItem(NS_MANIFEST_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function writeNamespaceManifest(nsSet: Set<string>): void {
  try {
    localStorage.setItem(NS_MANIFEST_KEY, JSON.stringify([...nsSet]));
  } catch (err) {
    console.warn("[LocalStorageProvider] writeNamespaceManifest failed:", err);
  }
}

function registerNamespace(namespace: StorageNamespace): void {
  const set = readNamespaceManifest();
  if (set.has(namespace)) return;
  set.add(namespace);
  writeNamespaceManifest(set);
}

function readKeyManifest(namespace: StorageNamespace): Set<string> {
  try {
    const raw = localStorage.getItem(nsManifestKey(namespace));
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function writeKeyManifest(namespace: StorageNamespace, keys: Set<string>): void {
  try {
    localStorage.setItem(nsManifestKey(namespace), JSON.stringify([...keys]));
  } catch (err) {
    console.warn("[LocalStorageProvider] writeKeyManifest failed:", err);
  }
}

function registerKey(namespace: StorageNamespace, key: string): void {
  const set = readKeyManifest(namespace);
  if (set.has(key)) return;
  set.add(key);
  writeKeyManifest(namespace, set);
  registerNamespace(namespace);
}

function unregisterKey(namespace: StorageNamespace, key: string): void {
  const set = readKeyManifest(namespace);
  if (!set.has(key)) return;
  set.delete(key);
  writeKeyManifest(namespace, set);
}

export const localStorageProvider: StorageProvider = {
  id: "local",
  label: "Browser Local Storage",

  isAvailable(): boolean {
    try {
      const probe = `${KEY_PREFIX}${NS_SEPARATOR}__probe__`;
      localStorage.setItem(probe, "1");
      const v = localStorage.getItem(probe);
      localStorage.removeItem(probe);
      return v === "1";
    } catch {
      return false;
    }
  },

  async read(namespace: StorageNamespace, key: string): Promise<string | null> {
    try {
      return localStorage.getItem(nsKey(namespace, key));
    } catch (err) {
      console.warn(`[LocalStorageProvider] read(${namespace}/${key}) failed:`, err);
      return null;
    }
  },

  async write(namespace: StorageNamespace, key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(nsKey(namespace, key), value);
      registerKey(namespace, key);
    } catch (err) {
      console.error(`[LocalStorageProvider] write(${namespace}/${key}) failed:`, err);
      throw err;
    }
  },

  async delete(namespace: StorageNamespace, key: string): Promise<void> {
    try {
      localStorage.removeItem(nsKey(namespace, key));
      unregisterKey(namespace, key);
    } catch (err) {
      console.warn(`[LocalStorageProvider] delete(${namespace}/${key}) failed:`, err);
    }
  },

  async listKeys(namespace: StorageNamespace): Promise<string[]> {
    const set = readKeyManifest(namespace);
    return [...set];
  },

  async clearNamespace(namespace: StorageNamespace): Promise<void> {
    try {
      const keys = readKeyManifest(namespace);
      for (const key of keys) {
        localStorage.removeItem(nsKey(namespace, key));
      }
      localStorage.removeItem(nsManifestKey(namespace));
      const nsSet = readNamespaceManifest();
      nsSet.delete(namespace);
      writeNamespaceManifest(nsSet);
    } catch (err) {
      console.warn(`[LocalStorageProvider] clearNamespace(${namespace}) failed:`, err);
    }
  },

  async clearAll(): Promise<void> {
    try {
      const nsSet = readNamespaceManifest();
      for (const ns of nsSet) {
        const typedNs = ns as StorageNamespace;
        const keys = readKeyManifest(typedNs);
        for (const key of keys) {
          localStorage.removeItem(nsKey(typedNs, key));
        }
        localStorage.removeItem(nsManifestKey(typedNs));
      }
      localStorage.removeItem(NS_MANIFEST_KEY);
    } catch (err) {
      console.warn("[LocalStorageProvider] clearAll failed:", err);
    }
  },
};
