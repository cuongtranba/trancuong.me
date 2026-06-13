/**
 * Pan / zoom for rendered Mermaid diagrams.
 *
 * `astro-mermaid` turns ```mermaid fences into `<pre class="mermaid">` and, at
 * runtime, fills each one with an `<svg>` via `pre.innerHTML = svg`. With
 * `autoTheme` it *re-renders* (swapping the SVG) whenever `data-theme` flips.
 *
 * So this enhancer:
 *  - wraps each diagram in a `<figure>` and puts the toolbar OUTSIDE the `<pre>`
 *    (a theme re-render only rewrites the `<pre>`'s contents — the toolbar
 *    survives), and
 *  - re-binds svg-pan-zoom every time the underlying `<svg>` is replaced.
 *
 * Inline diagrams get drag + button zoom but NOT mouse-wheel zoom, so scrolling
 * the page over a diagram still scrolls the page. The fullscreen overlay enables
 * the full set (wheel, double-click, drag).
 */

import svgPanZoomImport from "svg-pan-zoom";

/** Subset of the svg-pan-zoom instance API this module drives. */
interface PanZoom {
  zoomIn(): unknown;
  zoomOut(): unknown;
  reset(): unknown;
  resize(): unknown;
  fit(): unknown;
  center(): unknown;
  destroy(): void;
}

interface PanZoomOptions {
  panEnabled?: boolean;
  zoomEnabled?: boolean;
  controlIconsEnabled?: boolean;
  dblClickZoomEnabled?: boolean;
  mouseWheelZoomEnabled?: boolean;
  preventMouseEventsDefault?: boolean;
  fit?: boolean;
  center?: boolean;
  minZoom?: number;
  maxZoom?: number;
  zoomScaleSensitivity?: number;
}

/**
 * Build a pan/zoom controller for a diagram SVG. Injectable so the DOM
 * scaffolding can be unit-tested without real SVG geometry (which jsdom lacks).
 */
export type ZoomInit = (
  svg: SVGSVGElement,
  opts: { interactive: boolean }
) => PanZoom;

// The shipped types declare the export as an Instance rather than a callable,
// so re-type the import to the function it actually is.
type SvgPanZoomFn = (el: SVGElement, opts?: PanZoomOptions) => PanZoom;
const svgPanZoom = svgPanZoomImport as unknown as SvgPanZoomFn;

const realInit: ZoomInit = (svg, { interactive }) =>
  svgPanZoom(svg, {
    panEnabled: true,
    zoomEnabled: true,
    controlIconsEnabled: false,
    dblClickZoomEnabled: interactive,
    mouseWheelZoomEnabled: interactive,
    preventMouseEventsDefault: interactive,
    fit: true,
    center: true,
    minZoom: 0.5,
    maxZoom: 12,
    zoomScaleSensitivity: 0.3,
  });

interface FigureState {
  init: ZoomInit;
  boundSvg: SVGSVGElement | null;
  instance: PanZoom | null;
}

const states = new WeakMap<HTMLElement, FigureState>();

// − ↺ + ⤢ ✕
const GLYPH = { out: "−", reset: "↺", in: "+", expand: "⤢" };
const CLOSE_GLYPH = "✕";

function makeButton(label: string, glyph: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "mermaid-zoom__btn";
  button.setAttribute("aria-label", label);
  button.textContent = glyph;
  return button;
}

function normalizeSvg(svg: SVGSVGElement): void {
  // Mermaid sets a pixel `max-width`; clear it so the SVG fills its container
  // and svg-pan-zoom can fit/center against a known viewport size.
  svg.style.maxWidth = "none";
  svg.style.width = "100%";
  svg.style.height = "100%";
}

function buildToolbar(state: FigureState): HTMLElement {
  const bar = document.createElement("div");
  bar.className = "mermaid-zoom__toolbar";

  const out = makeButton("Zoom out", GLYPH.out);
  const reset = makeButton("Reset zoom", GLYPH.reset);
  const zoomIn = makeButton("Zoom in", GLYPH.in);
  const expand = makeButton("Expand to fullscreen", GLYPH.expand);

  out.addEventListener("click", () => state.instance?.zoomOut());
  reset.addEventListener("click", () => state.instance?.reset());
  zoomIn.addEventListener("click", () => state.instance?.zoomIn());
  expand.addEventListener("click", () => openOverlay(state));

  bar.append(out, reset, zoomIn, expand);
  return bar;
}

function openOverlay(state: FigureState): void {
  if (!state.boundSvg) return;
  const lastFocused = document.activeElement as HTMLElement | null;

  const overlay = document.createElement("div");
  overlay.className = "mermaid-zoom-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Zoomed diagram");

  const bar = document.createElement("div");
  bar.className = "mermaid-zoom-overlay__bar";
  const out = makeButton("Zoom out", GLYPH.out);
  const reset = makeButton("Reset zoom", GLYPH.reset);
  const zoomIn = makeButton("Zoom in", GLYPH.in);
  const close = makeButton("Close", CLOSE_GLYPH);
  bar.append(out, reset, zoomIn, close);

  const stage = document.createElement("div");
  stage.className = "mermaid-zoom-overlay__stage";
  const clone = state.boundSvg.cloneNode(true) as SVGSVGElement;
  normalizeSvg(clone);
  stage.append(clone);

  overlay.append(bar, stage);
  document.body.append(overlay);
  document.body.style.overflow = "hidden";

  const instance = state.init(clone, { interactive: true });
  out.addEventListener("click", () => instance.zoomOut());
  reset.addEventListener("click", () => instance.reset());
  zoomIn.addEventListener("click", () => instance.zoomIn());

  const teardown = (): void => {
    document.removeEventListener("keydown", onKey);
    try {
      instance.destroy();
    } catch {
      /* already detached */
    }
    overlay.remove();
    document.body.style.overflow = "";
    lastFocused?.focus?.();
  };
  const onKey = (event: KeyboardEvent): void => {
    if (event.key === "Escape") teardown();
  };

  close.addEventListener("click", teardown);
  overlay.addEventListener("click", event => {
    if (event.target === overlay) teardown(); // backdrop only
  });
  document.addEventListener("keydown", onKey);
  close.focus();
}

/**
 * Make a single rendered diagram interactive. No-op until astro-mermaid has
 * produced the `<svg>`; idempotent; re-binds when the SVG is swapped.
 */
export function enhanceDiagram(
  pre: HTMLElement,
  init: ZoomInit = realInit
): void {
  const svg = pre.querySelector("svg");
  if (!svg) return;

  let figure = pre.parentElement;
  if (!figure || !figure.classList.contains("mermaid-zoom")) {
    figure = document.createElement("figure");
    figure.className = "mermaid-zoom not-prose";
    const state: FigureState = { init, boundSvg: null, instance: null };
    states.set(figure, state);
    pre.before(figure);
    figure.append(buildToolbar(state), pre);
  }

  const state = states.get(figure);
  if (!state) return;

  if (state.boundSvg === svg) return; // already bound to this SVG
  try {
    state.instance?.destroy();
  } catch {
    /* previous instance detached by a re-render */
  }
  normalizeSvg(svg as SVGSVGElement);
  state.boundSvg = svg as SVGSVGElement;
  state.instance = state.init(svg as SVGSVGElement, { interactive: false });
}

/** Enhance every diagram under `root`. */
export function enhanceAll(
  root: ParentNode = document,
  init: ZoomInit = realInit
): void {
  for (const pre of root.querySelectorAll<HTMLElement>("pre.mermaid")) {
    enhanceDiagram(pre, init);
  }
}

// Wire up for the initial load and every ClientRouter navigation. A coalesced
// MutationObserver catches both the async first render and theme re-renders.
if (typeof document !== "undefined") {
  let observer: MutationObserver | null = null;
  let scheduled = false;

  const run = (): void => {
    scheduled = false;
    enhanceAll();
  };
  const schedule = (): void => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(run);
  };

  document.addEventListener("astro:page-load", () => {
    enhanceAll();
    observer?.disconnect();
    observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-processed"],
    });
  });
}
