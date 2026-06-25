# trancuong.me

Personal blog of **Tran Cuong** — a software engineer in Vietnam who writes mostly
Go, occasionally Rust, and builds tooling around coding agents.

Live site: <https://trancuong.me> · Source: <https://github.com/cuongtranba/trancuong.me>

The blog is where I think out loud about distributed systems, clean architecture,
developer tooling, and how coding agents fit into day-to-day engineering. Built on
the [AstroPaper](https://github.com/satnaing/astro-paper) theme (Astro + TailwindCSS v4).

## What you'll find here

A few recent posts give the flavour:

- **Hexagonal Go: feature slices that test without a database** — a Go layout that keeps domain logic transport-agnostic.
- **One streaming interface over Claude's SDK, a PTY, and Codex JSON-RPC** — funnelling three agent transports through one TS interface.
- **wtguard: a three-layer guard that keeps parallel agents off main** — Docker isolation + git-as-lock + a commit guard.
- **Running coding agents in parallel without babysitting them** — multi-window layout and push notifications.
- **Resume the right Claude Code session by typing `claude` in zsh** — a small, dependency-free zsh plugin.

The full, always-current list lives in the feeds below.

## For LLMs & agents

This site is built to be read by machines as well as people:

- **`/llms.txt`** — an [llmstxt.org](https://llmstxt.org/) overview: every published
  post as `- [title](url): description`, so an agent can fetch any entry in full.
  Generated at [`src/pages/llms.txt.ts`](src/pages/llms.txt.ts).
- **`/robots.txt`** — declares [Content Signals](https://contentsignals.org/)
  (`search=yes, ai-input=yes, ai-train=yes`): content here may be indexed, used as
  AI input, and used for training. Generated at [`src/pages/robots.txt.ts`](src/pages/robots.txt.ts).
- **`/rss.xml`** — standard RSS feed.
- **Sitemap** — `sitemap-index.xml`.

## Project structure

```bash
/
├── public/                    # favicon, static OG image, pagefind index (build-time)
├── src/
│   ├── assets/                # icons + images
│   ├── components/
│   ├── content/
│   │   ├── pages/             # static pages (about.md, ...)
│   │   └── posts/             # blog posts (.md / .mdx)
│   ├── layouts/
│   ├── pages/                 # routes, incl. llms.txt.ts & robots.txt.ts
│   ├── scripts/
│   ├── styles/
│   ├── types/
│   ├── utils/
│   ├── config.ts              # resolves defaults over the user config
│   └── content.config.ts      # content collection schema
├── astro-paper.config.ts      # site metadata, features, socials, share links
└── astro.config.ts
```

Posts live in `src/content/posts/`. A subdirectory name becomes part of the post URL.
Required frontmatter: `title`, `description`, `pubDatetime`, `tags`.

## Tech stack

**Framework** - [Astro](https://astro.build/) ·
**Types** - [TypeScript](https://www.typescriptlang.org/) ·
**Styling** - [TailwindCSS v4](https://tailwindcss.com/) ·
**Search** - [Pagefind](https://pagefind.app/) ·
**Diagrams** - [astro-mermaid](https://github.com/joesaby/astro-mermaid) ·
**Code highlighting** - [Shiki](https://shiki.style/) ·
**Dynamic OG images** - [Satori](https://github.com/vercel/satori) + [Sharp](https://sharp.pixelplumbing.com/) ·
**Tests** - [Vitest](https://vitest.dev/)

## Running locally

```bash
pnpm install
pnpm dev            # dev server at localhost:4321 (no search index)
```

## Commands

| Command            | Action                                                            |
| :----------------- | :---------------------------------------------------------------- |
| `pnpm dev`         | Start dev server (no Pagefind index)                              |
| `pnpm build`       | Type-check → build → Pagefind index → copy to `public/`           |
| `pnpm preview`     | Preview the production build                                      |
| `pnpm lint`        | ESLint                                                            |
| `pnpm format`      | Prettier (write)                                                  |
| `pnpm format:check`| Prettier (check only)                                             |
| `pnpm test`        | Run all Vitest tests                                              |

## Contact

Reach me by [email](mailto:bacuongtr@gmail.com) or on [GitHub](https://github.com/cuongtranba).

## License

Theme licensed under MIT (AstroPaper, © Sat Naing & contributors). Blog content
© Tran Cuong.
