import { NextRequest, NextResponse } from "next/server";

// POST /api/publish/compile?XTransformPort=3000 (but the gateway handles the port)
// Actually, since this is the main Next.js server, no XTransformPort needed.
// But per the project rules, we use relative paths.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { files, blueprint, name, url } = body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided for compilation" },
        { status: 400 }
      );
    }

    if (!["integrated", "external"].includes(blueprint)) {
      return NextResponse.json(
        { error: "Invalid blueprint. Must be 'integrated' or 'external'" },
        { status: 400 }
      );
    }

    if (blueprint === "external" && !url) {
      return NextResponse.json(
        { error: "External blueprint requires a deployment URL" },
        { status: 400 }
      );
    }

    // Simulate compilation: validate files, compute stats
    const totalSize = files.reduce((acc: number, f: { source: string }) => acc + f.source.length, 0);
    const htmlFiles = files.filter((f: { name: string }) => f.name.endsWith(".html"));
    const cssFiles = files.filter((f: { name: string }) => f.name.endsWith(".css"));
    const jsFiles = files.filter((f: { name: string }) => f.name.endsWith(".js") || f.name.endsWith(".ts"));

    const compileResult = {
      success: true,
      manifest: {
        name: name || "Untitled App",
        blueprint,
        files: files.length,
        totalSize,
        breakdown: { html: htmlFiles.length, css: cssFiles.length, js: jsFiles.length },
        compiledAt: new Date().toISOString(),
      },
      // For integrated modules, include the compiled bundle
      compiledFiles: files.map((f: { name: string; language: string; source: string }) => ({
        name: f.name,
        language: f.language || "javascript",
        source: f.source,
      })),
      // For external, echo the URL
      url: blueprint === "external" ? url : undefined,
    };

    // Simulate compile time
    await new Promise((resolve) => setTimeout(resolve, 300));

    return NextResponse.json(compileResult);
  } catch {
    return NextResponse.json(
      { error: "Compilation failed" },
      { status: 500 }
    );
  }
}