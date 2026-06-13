import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import mermaid from "mermaid";

/**
 * Guards against shipping a broken Mermaid diagram in a blog post.
 *
 * Every ```mermaid fenced block in `src/content/posts` is fed through the same
 * parser the browser uses (`mermaid.parse`). A syntax error — e.g. unquoted
 * parentheses in an edge label like `-->|Write(input)|` — rejects here and
 * fails CI, instead of silently rendering "Error rendering diagram" in prod.
 */

const postsDir = join(process.cwd(), "src", "content", "posts");

/** A single ```mermaid block, tagged with where it came from for error output. */
interface Diagram {
  file: string;
  /** 1-based line of the opening fence, so failures point at the source. */
  line: number;
  code: string;
}

/** Pull every fenced ```mermaid block out of a markdown source string. */
function extractMermaidBlocks(file: string, source: string): Diagram[] {
  const lines = source.split("\n");
  const diagrams: Diagram[] = [];
  let start = -1;
  let buffer: string[] = [];

  lines.forEach((line, i) => {
    const fence = line.trim();
    if (start === -1) {
      if (/^```\s*mermaid\s*$/.test(fence)) {
        start = i;
        buffer = [];
      }
    } else if (fence === "```") {
      diagrams.push({ file, line: start + 1, code: buffer.join("\n") });
      start = -1;
    } else {
      buffer.push(line);
    }
  });

  return diagrams;
}

function collectDiagrams(): Diagram[] {
  return readdirSync(postsDir)
    .filter(name => name.endsWith(".md") || name.endsWith(".mdx"))
    .flatMap(name => {
      const path = join(postsDir, name);
      return extractMermaidBlocks(name, readFileSync(path, "utf8"));
    });
}

const diagrams = collectDiagrams();

describe("mermaid diagrams in blog posts", () => {
  it("finds at least one diagram to validate", () => {
    expect(diagrams.length).toBeGreaterThan(0);
  });

  it.each(diagrams.map(d => [`${d.file}:${d.line}`, d] as const))(
    "parses %s",
    async (_label, diagram) => {
      // mermaid.parse rejects on a syntax error; suppressErrors:false makes
      // the rejection (with the parser's message) the assertion target.
      await expect(
        mermaid.parse(diagram.code, { suppressErrors: false })
      ).resolves.toBeTruthy();
    }
  );
});
