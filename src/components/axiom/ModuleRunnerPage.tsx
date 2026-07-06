"use client";

import { useAxiom } from "@/lib/axiom/store";
import { useMemo, useState } from "react";
import { X, ExternalLink, Package, Loader2 } from "lucide-react";
import type { PublishedAppCompiledFile } from "@/lib/axiom/types";

export default function ModuleRunnerPage() {
  const runningModuleId = useAxiom((s) => s.runningModuleId);
  const closeModule = useAxiom((s) => s.closeModule);
  const publishedApps = useAxiom((s) => s.publishedApps);

  const [iframeLoading, setIframeLoading] = useState(true);

  const activeModule = useMemo(
    () => publishedApps.find((a) => a.id === runningModuleId) ?? null,
    [publishedApps, runningModuleId],
  );

  // Build srcDoc for integrated modules (same logic as old PublishedAppRunner)
  const srcDoc = useMemo(() => {
    if (!activeModule || activeModule.blueprint !== "integrated") return undefined;
    const files = activeModule.compiledFiles as PublishedAppCompiledFile[];
    if (!files || !Array.isArray(files) || files.length === 0) {
      return buildFallbackHTML("<p>No compiled files available.</p>");
    }
    const indexFile = files.find((f) => f.name === "index.html");
    const cssFiles = files.filter((f) => f.name.endsWith(".css"));
    const jsFiles = files.filter((f) => f.name.endsWith(".js"));
    let html: string;
    if (indexFile) {
      html = indexFile.source;
      if (cssFiles.length > 0) {
        const cssInjection = cssFiles.map((f) => `<style data-inject="${f.name}">\n${f.source}\n</style>`).join("\n");
        if (html.includes("</head>")) html = html.replace("</head>", `${cssInjection}\n</head>`);
        else if (html.includes("</body>")) html = html.replace("</body>", `${cssInjection}\n</body>`);
        else html = cssInjection + html;
      }
      if (jsFiles.length > 0) {
        const jsInjection = jsFiles.map((f) => `<script data-inject="${f.name}">\n${f.source}\n<\/script>`).join("\n");
        if (html.includes("</body>")) html = html.replace("</body>", `${jsInjection}\n</body>`);
        else html = html + "\n" + jsInjection;
      }
    } else {
      const cssBlock = cssFiles.map((f) => `/* ${f.name} */\n${f.source}`).join("\n\n");
      const jsBlock = jsFiles.map((f) => `// ${f.name}\n${f.source}`).join("\n\n");
      html = buildFallbackHTML(`<style>${cssBlock}</style>\n<script>${jsBlock}<\/script>`);
    }
    // Console capture
    const scripts = `<script>
(function() {
  var origLog = console.log; var origWarn = console.warn; var origError = console.error;
  function send(type, args) { try { var msg = Array.prototype.slice.call(args).map(function(a) { return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a); }).join(' '); parent.postMessage({ source: 'axiom-runner', type: type, message: msg }, '*'); } catch(e) {} }
  console.log = function() { send('log', arguments); origLog.apply(console, arguments); };
  console.warn = function() { send('warn', arguments); origWarn.apply(console, arguments); };
  console.error = function() { send('error', arguments); origError.apply(console, arguments); };
})();
<\/script>`;
    if (html.includes("</body>")) html = html.replace("</body>", `${scripts}\n</body>`);
    else html = html + "\n" + scripts;
    return html;
  }, [activeModule]);

  if (!activeModule) return null;

  const isIntegrated = activeModule.blueprint === "integrated";

  return (
    <div className="h-full flex flex-col bg-axiom-void">
      {/* Slim top bar */}
      <div className="h-10 bg-axiom-deep border-b border-axiom-edge/40 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {activeModule.glyph ? (
            <span className="text-sm">{activeModule.glyph}</span>
          ) : isIntegrated ? (
            <Package className="w-3.5 h-3.5 text-axiom-emerald shrink-0" />
          ) : (
            <ExternalLink className="w-3.5 h-3.5 text-axiom-cyan shrink-0" />
          )}
          <span className="text-sm font-medium text-axiom-text truncate">{activeModule.name}</span>
          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full leading-none shrink-0 border ${
            isIntegrated
              ? "bg-axiom-emerald/15 text-axiom-emerald border-axiom-emerald/25"
              : "bg-axiom-cyan/15 text-axiom-cyan border-axiom-cyan/25"
          }`}>
            {isIntegrated ? "INTEGRATED" : "EXTERNAL"}
          </span>
        </div>
        <button
          onClick={closeModule}
          className="p-1.5 rounded-md text-axiom-dim hover:text-axiom-rose hover:bg-axiom-rose/10 transition-colors"
          aria-label="Close module"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {/* Content */}
      <div className="flex-1 relative">
        {iframeLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-axiom-void/60">
            <Loader2 className="w-6 h-6 text-axiom-dim animate-spin" />
          </div>
        )}
        {isIntegrated ? (
          <iframe
            key={`integrated-${activeModule.id}`}
            srcDoc={srcDoc}
            sandbox="allow-scripts allow-modals"
            className="w-full h-full border-0 bg-white"
            title={activeModule.name}
            onLoad={() => setIframeLoading(false)}
          />
        ) : (
          <iframe
            key={`external-${activeModule.id}`}
            src={activeModule.url}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            className="w-full h-full border-0 bg-white"
            title={activeModule.name}
            onLoad={() => setIframeLoading(false)}
          />
        )}
      </div>
    </div>
  );
}

function buildFallbackHTML(bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Module</title>
</head>
<body>
  ${bodyContent}
</body>
</html>`;
}
