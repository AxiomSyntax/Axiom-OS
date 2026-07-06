"use client";

import { useEffect } from "react";
import { loadCustomStyles, stylesToCss } from "@/lib/axiom/customStyles";

/**
 * RuntimeStyleInjector
 * ────────────────────
 * Loads custom CSS styles from localStorage on app boot and injects them
 * as an active <style id="axiom-runtime-overrides"> block into the HTML head.
 *
 * This ensures that visual modifications made in the DevLab Designer Studio
 * are instantly applied across ALL pages of the application — when the user
 * switches from DevLab to Home, Dashboard, Brain, etc., the custom styles
 * remain active.
 *
 * The component also listens for storage events so changes in other tabs
 * are picked up, and re-injects on route changes.
 */
export function RuntimeStyleInjector() {
  useEffect(() => {
    const injectStyles = () => {
      try {
        const styles = loadCustomStyles();
        if (styles.length === 0) return;

        const css = stylesToCss(styles);
        if (!css) return;

        // Find or create the runtime overrides <style> tag
        let styleEl = document.getElementById(
          "axiom-runtime-overrides",
        ) as HTMLStyleElement | null;

        if (!styleEl) {
          styleEl = document.createElement("style");
          styleEl.id = "axiom-runtime-overrides";
          document.head.appendChild(styleEl);
        }

        styleEl.textContent = css;
      } catch {
        // fail silently — don't crash the app
      }
    };

    // Inject immediately on mount
    injectStyles();

    // Re-inject when localStorage changes (e.g., after saving in DevLab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "axiom_custom_styles" || e.key === null) {
        injectStyles();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // Re-inject on custom event (for same-tab saves)
    const handleCustomSave = () => injectStyles();
    window.addEventListener("axiom-styles-saved", handleCustomSave);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("axiom-styles-saved", handleCustomSave);
    };
  }, []);

  // This component renders nothing — it only injects styles
  return null;
}
