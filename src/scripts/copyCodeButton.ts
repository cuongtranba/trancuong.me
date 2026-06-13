/**
 * Copy-to-clipboard buttons for syntax-highlighted code blocks.
 *
 * IMPORTANT — why the `:not(.mermaid)` guard exists:
 * `astro-mermaid` transforms ```mermaid fences into `<pre class="mermaid">`
 * elements at build time, then renders them in the browser by reading the
 * diagram source from the element's `textContent`. If we append a "Copy"
 * button (a text-bearing node) inside that `<pre>` before mermaid runs, the
 * button's label leaks into the diagram source — e.g. `J[merge via PR]Copy` —
 * and mermaid throws a parse error. Attaching buttons only to non-mermaid
 * `<pre>` elements keeps the diagram source pristine.
 *
 * Re-runs on every client-side navigation via the `astro:page-load` event,
 * the documented pattern for scripts that must survive `ClientRouter` view
 * transitions.
 */

const COPY_LABEL = "Copy";
const COPIED_LABEL = "Copied";
/** Marks a `<pre>` whose copy button is already attached, so repeated calls
 *  (e.g. an `astro:page-load` fired twice) never double-wrap an element. */
const ATTACHED_FLAG = "copyAttached";

async function copyCode(
  block: HTMLElement,
  button: HTMLButtonElement
): Promise<void> {
  const code = block.querySelector("code");
  const text = (code as HTMLElement | null)?.innerText;
  await navigator.clipboard.writeText(text ?? "");

  button.innerText = COPIED_LABEL;
  setTimeout(() => {
    button.innerText = COPY_LABEL;
  }, 700);
}

/**
 * Attach a copy button to every code block under `root`, skipping mermaid
 * diagrams. Idempotent: a block tagged as already-attached is left untouched.
 *
 * @param root - Scope to search within. Defaults to the whole document.
 */
export function attachCopyButtons(root: ParentNode = document): void {
  const codeBlocks = Array.from(
    root.querySelectorAll<HTMLPreElement>("pre:not(.mermaid)")
  );

  for (const codeBlock of codeBlocks) {
    if (codeBlock.dataset[ATTACHED_FLAG] === "true") continue;
    codeBlock.dataset[ATTACHED_FLAG] = "true";

    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";

    const computedStyle = getComputedStyle(codeBlock);
    const hasFileNameOffset =
      computedStyle.getPropertyValue("--file-name-offset").trim() !== "";

    const topClass = hasFileNameOffset ? "top-(--file-name-offset)" : "-top-3";

    const copyButton = document.createElement("button");
    copyButton.className = `copy-code absolute end-3 ${topClass} rounded bg-muted border border-muted px-2 py-1 text-xs leading-4 text-foreground font-medium`;
    copyButton.innerHTML = COPY_LABEL;
    codeBlock.setAttribute("tabindex", "0");
    codeBlock.appendChild(copyButton);

    codeBlock.parentNode?.insertBefore(wrapper, codeBlock);
    wrapper.appendChild(codeBlock);

    copyButton.addEventListener("click", () => {
      void copyCode(codeBlock, copyButton);
    });
  }
}

// Self-wire for both the initial load and every ClientRouter navigation.
if (typeof document !== "undefined") {
  document.addEventListener("astro:page-load", () => attachCopyButtons());
}
