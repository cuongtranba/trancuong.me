# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev            # Start dev server (no search index)
pnpm build          # Type-check → build → pagefind index → copy to public/
pnpm preview        # Preview the production build
pnpm lint           # ESLint
pnpm format         # Prettier (write)
pnpm format:check   # Prettier (check only)
pnpm test           # Run all Vitest tests
```

Run a single test file:
```bash
pnpm vitest run src/scripts/mermaidDiagrams.test.ts
```

## Architecture

This is a personal blog built on the **AstroPaper** theme (Astro + TailwindCSS v4).

### Configuration

- **`astro-paper.config.ts`** — the single user-facing config file (site metadata, features, socials, share links). Edit this to change site-wide settings.
- **`src/config.ts`** — applies defaults on top of the user config and exposes a `ResolvedAstroPaperConfig`. Other files import from here, not from `astro-paper.config.ts` directly.
- **`src/types/config.ts`** — all config types + `defineAstroPaperConfig` helper.

### Content

- Blog posts: `src/content/posts/*.{md,mdx}` — required frontmatter: `title`, `description`, `pubDatetime`, `tags`.
- Static pages: `src/content/pages/*.{md,mdx}` — required frontmatter: `title`.
- Content schema defined in `src/content.config.ts`.

### Path Alias

`@` maps to `src/` (configured in both `tsconfig.json` and `vitest.config.ts`).

### Key Integrations

- **Mermaid** (`astro-mermaid`) — renders fenced `mermaid` blocks; auto-themes to light/dark. Edge labels with parentheses must be quoted (e.g. `-->|"Write(input)"|`).
- **Pagefind** — static search index; only generated during `pnpm build`, not `pnpm dev`.
- **Shiki** — code highlighting with a custom `transformerFileName` for displaying filenames above code blocks.
- **Dynamic OG images** — generated per post at `/posts/[slug]/index.png.ts` using Satori + Sharp.

### Social Icons

Social links and share links reference SVG filenames in `src/assets/icons/socials/`. Adding a new social requires placing `<name>.svg` there first.

### Testing

Tests live alongside source in `src/**/*.test.ts` and run with `vitest` + `jsdom`. The `mermaidDiagrams.test.ts` test parses every fenced mermaid block in `src/content/posts` through `mermaid.parse` — a syntax error there fails CI before it reaches production.
