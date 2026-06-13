import { describe, it, expect, beforeEach } from "vitest";
import { attachCopyButtons } from "./copyCodeButton";

/** Build a `<pre>` with the given class and inner HTML, as Shiki/astro-mermaid
 *  would emit it into the rendered article. */
function makePre(className: string, inner: string): HTMLPreElement {
  const pre = document.createElement("pre");
  pre.className = className;
  pre.innerHTML = inner;
  return pre;
}

describe("attachCopyButtons", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("attaches a copy button to a syntax-highlighted code block", () => {
    const pre = makePre("astro-code", "<code>const x = 1;</code>");
    document.body.appendChild(pre);

    attachCopyButtons(document.body);

    expect(pre.querySelector("button.copy-code")).not.toBeNull();
  });

  // Regression: astro-mermaid renders diagrams from <pre class="mermaid">'s
  // textContent. A copy button injected there leaks its "Copy" label into the
  // diagram source (e.g. `J[merge via PR]Copy`), which made mermaid throw
  // "Parse error on line 8 … got 'NODE_STRING'". Guard both halves of the bug.
  it("never touches a mermaid diagram, keeping its source pristine", () => {
    const diagram = "flowchart LR\n  A --> B[merge via PR]";
    const pre = makePre("mermaid", diagram);
    document.body.appendChild(pre);

    attachCopyButtons(document.body);

    expect(pre.querySelector("button.copy-code")).toBeNull();
    expect(pre.textContent).toBe(diagram);
  });

  it("processes code blocks and skips mermaid blocks in the same document", () => {
    const code = makePre("astro-code", "<code>go build ./...</code>");
    const stateDiagram = "stateDiagram-v2\n  [*] --> Idle";
    const diagram = makePre("mermaid", stateDiagram);
    document.body.append(code, diagram);

    attachCopyButtons(document.body);

    expect(code.querySelector("button.copy-code")).not.toBeNull();
    expect(diagram.querySelector("button.copy-code")).toBeNull();
    expect(diagram.textContent).toBe(stateDiagram);
  });

  it("is idempotent — repeated runs never add duplicate buttons", () => {
    const pre = makePre("astro-code", "<code>x</code>");
    document.body.appendChild(pre);

    attachCopyButtons(document.body);
    attachCopyButtons(document.body);

    expect(pre.querySelectorAll("button.copy-code")).toHaveLength(1);
  });
});
