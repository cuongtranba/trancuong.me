import { describe, it, expect, beforeEach, vi } from "vitest";
import { enhanceDiagram, enhanceAll, type ZoomInit } from "./mermaidZoom";

/** A spyable stand-in for an svg-pan-zoom instance. */
function makeFakeInstance() {
  return {
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    reset: vi.fn(),
    resize: vi.fn(),
    fit: vi.fn(),
    center: vi.fn(),
    destroy: vi.fn(),
  };
}

/** An injectable initializer that records every instance it hands out, so a
 *  test can assert which one was destroyed/driven. svg-pan-zoom itself needs
 *  real SVG geometry (absent in jsdom), so we never call the real thing here. */
function makeInit() {
  const instances: ReturnType<typeof makeFakeInstance>[] = [];
  const init: ZoomInit = vi.fn(() => {
    const inst = makeFakeInstance();
    instances.push(inst);
    return inst;
  });
  return { init, instances };
}

function makeRenderedPre(svgMarkup = "<svg><g></g></svg>"): HTMLPreElement {
  const pre = document.createElement("pre");
  pre.className = "mermaid";
  pre.setAttribute("data-processed", "true");
  pre.innerHTML = svgMarkup;
  document.body.appendChild(pre);
  return pre;
}

describe("mermaidZoom", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.body.style.overflow = "";
  });

  it("does nothing until the diagram SVG has been rendered", () => {
    const pre = document.createElement("pre");
    pre.className = "mermaid";
    document.body.appendChild(pre); // no <svg> yet
    const { init } = makeInit();

    enhanceDiagram(pre, init);

    expect(document.querySelector(".mermaid-zoom")).toBeNull();
    expect(init).not.toHaveBeenCalled();
  });

  it("wraps a rendered diagram with a toolbar and binds zoom once", () => {
    const pre = makeRenderedPre();
    const { init, instances } = makeInit();

    enhanceDiagram(pre, init);

    const figure = document.querySelector("figure.mermaid-zoom");
    expect(figure).not.toBeNull();
    // Toolbar lives OUTSIDE the <pre> so theme re-renders can't wipe it.
    const toolbar = figure?.querySelector(".mermaid-zoom__toolbar");
    expect(toolbar?.parentElement).toBe(figure);
    expect(toolbar?.querySelectorAll("button")).toHaveLength(4); // − ↺ + ⤢
    expect(figure?.contains(pre)).toBe(true);
    expect(instances).toHaveLength(1);
    expect(init).toHaveBeenCalledWith(expect.anything(), {
      interactive: false,
    });
  });

  it("drives the bound instance from the toolbar buttons", () => {
    const pre = makeRenderedPre();
    const { init, instances } = makeInit();
    enhanceDiagram(pre, init);

    const [zoomOut, reset, zoomIn] =
      document.querySelectorAll<HTMLButtonElement>(
        ".mermaid-zoom__toolbar button"
      );
    zoomOut.click();
    reset.click();
    zoomIn.click();

    expect(instances[0].zoomOut).toHaveBeenCalledOnce();
    expect(instances[0].reset).toHaveBeenCalledOnce();
    expect(instances[0].zoomIn).toHaveBeenCalledOnce();
  });

  it("is idempotent — repeat runs never duplicate the wrapper or instance", () => {
    const pre = makeRenderedPre();
    const { init } = makeInit();

    enhanceDiagram(pre, init);
    enhanceDiagram(pre, init);
    enhanceAll(document, init);

    expect(document.querySelectorAll("figure.mermaid-zoom")).toHaveLength(1);
    expect(document.querySelectorAll(".mermaid-zoom__toolbar")).toHaveLength(1);
    expect(init).toHaveBeenCalledOnce();
  });

  // Regression: astro-mermaid re-renders on theme toggle by replacing the SVG.
  // The old instance must be destroyed and a fresh one bound to the new SVG.
  it("re-binds zoom when the underlying SVG is swapped (theme re-render)", () => {
    const pre = makeRenderedPre();
    const { init, instances } = makeInit();
    enhanceDiagram(pre, init);

    // Simulate astro-mermaid's `pre.innerHTML = newSvg`.
    pre.innerHTML = "<svg id='second'><g></g></svg>";
    enhanceDiagram(pre, init);

    expect(instances).toHaveLength(2);
    expect(instances[0].destroy).toHaveBeenCalledOnce();
    expect(document.querySelectorAll("figure.mermaid-zoom")).toHaveLength(1);
  });

  it("opens a fullscreen overlay on expand and closes it on Escape", () => {
    const pre = makeRenderedPre();
    const { init, instances } = makeInit();
    enhanceDiagram(pre, init);

    const expand = document.querySelectorAll<HTMLButtonElement>(
      ".mermaid-zoom__toolbar button"
    )[3];
    expand.click();

    const overlay = document.querySelector(".mermaid-zoom-overlay");
    expect(overlay).not.toBeNull();
    expect(overlay?.querySelector("svg")).not.toBeNull(); // a clone, not the original
    expect(instances).toHaveLength(2); // inline + overlay
    expect(document.body.style.overflow).toBe("hidden"); // page scroll locked

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(document.querySelector(".mermaid-zoom-overlay")).toBeNull();
    expect(instances[1].destroy).toHaveBeenCalledOnce();
    expect(document.body.style.overflow).toBe("");
  });
});
