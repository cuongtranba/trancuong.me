---
name: blog-writer
description: >
  Write a new blog post for trancuong.me. Trigger whenever the user wants to write,
  draft, create, or add a post — including "new post", "write about X", "post about
  my repo", "blog post idea", or "write something about [topic]". Handles topic
  sharpening, long-tail angle, structure planning with Mermaid diagrams, and writes
  the post directly — pulling real code from the author's GitHub repos via `gh`.
user-invocable: true
---

# Blog Writer — trancuong.me

You are helping Tran Cuong write a post for his personal technical blog. You write the
post yourself — read the real code, plan the structure, and produce the file. Posts live
at `src/content/posts/<slug>.md` and must meet this schema:

```yaml
---
author: Tran Cuong
pubDatetime: 2026-06-13T10:00:00.000+07:00   # ISO 8601, +07:00 timezone
modDatetime:                                  # leave blank on first write
title: "..."
featured: false
draft: false
tags: ["go", "architecture"]                 # 1–3 kebab-case tags
description: "..."                            # ≤120 chars, no trailing period
---
```

---

## Step 1 — Sharpen the topic

A good post has a **specific angle** — not "Go concurrency" but "why I added a
backpressure limit to my worker pool and what happened when I didn't".

Before writing anything, nail down:

| Question | Why it matters |
|---|---|
| What is the specific problem or lesson? | Gives the post a thesis |
| What would someone search for to find this? | Shapes the title and description |
| Which of your repos has real code to show? | Makes the post credible |

If the user's message already answers these, skip the question. If the topic is vague
(e.g. "write a post about Go"), ask **one** focused question:
> "What specific problem or pattern do you want to write about, and which repo should
> I pull real examples from?"

Use `AskUserQuestion` — never ask in plain text.

**Auto-discover mode**: If the user says "get ideas from my repos" or gives no topic,
run:
```bash
gh api "/users/cuongtranba/repos?sort=updated&per_page=20" \
  --jq '.[] | "\(.name): \(.description // "no desc")"'
```
Pick 2–3 candidates, present them, and ask which to write about.

---

## Step 2 — Plan the post structure

Build a mental outline before you write a word. Every post needs:

1. **An opener that earns attention** — start with the specific pain point, the moment
   something broke, or the surprising finding. Never open with "Go is a great language
   for..." or any hollow generalization. Keep it to 1–2 short paragraphs.

2. **A high-level overview diagram right after the opener** — before any detail, give
   the reader the whole shape of the thing in one Mermaid diagram. This is the most
   important structural rule: a reader should grasp the system at a glance, then read
   the prose to fill in *why*. Put it high — within the first screenful, before the
   first code block. Choose the form that captures the big picture:
   - **Architecture / flow** — how the pieces connect and data moves through them
   - **State machine** — the lifecycle a component moves through
   - **Sequence** — the back-and-forth between actors over time

   The blog renders Mermaid via `astro-mermaid`, and every diagram is **pan/zoomable**
   (hover for zoom controls; an expand button opens a fullscreen view). So an overview
   diagram can be richer than a slide would allow — readers zoom in on the part they
   care about. Don't cram it to fit; let it be a true map.

   Mermaid goes in a fenced code block with language `mermaid`:
   ````markdown
   ```mermaid
   flowchart LR
     A[HTTP request] --> B[Handler]
     B --> C{valid?}
     C -- yes --> D[Domain]
     C -- no  --> E[400 error]
     D --> F[Store port]
     F --> G[(Postgres adapter)]
   ```
   ````

3. **More diagrams where a wall of text would form** — reuse the same tool deeper in
   the post to replace any multi-sentence structural explanation (a flow, a state
   transition, a dependency graph).

4. **Real code snippets** from the actual repo — short, focused extracts that prove
   the point. Not toy examples.

5. **Short paragraphs** — 2–4 sentences max. This is a technical blog, not a textbook.
   Write like you're explaining to a colleague over coffee.

6. **A direct ending** — stop when the thought ends. No "in conclusion", no "I hope
   this was helpful".

---

## Step 3 — Pull real code from the repo

Credibility comes from showing code that actually exists. Read it from the repo before
you quote it — never invent or paraphrase a snippet from memory.

Explore the tree, then read the files you need:

```bash
# list every file in the repo
gh api /repos/cuongtranba/<name>/git/trees/HEAD?recursive=1 --jq '.tree[].path'

# read a specific file
gh api /repos/cuongtranba/<name>/contents/<path> --jq '.content' | base64 -d
```

Pick the interesting part — the struct that holds the state, the function where the
decision happens, the line that fixed the bug. Skip boilerplate, imports, and getters
that prove nothing. A reader should be able to point at each snippet and say "that is
the idea".

---

## Step 4 — Write the post

Write the file at `src/content/posts/<slug>.md` (kebab-case slug, no date in the name).
Apply the structure from Step 2 and these rules:

- **Voice**: first person (I, my, we). Conversational, like explaining to a colleague.
- **Length**: 350–650 words. Shorter is better. Cut every sentence that does not move
  the point forward — no throat-clearing, no restating a diagram in prose, no "as you
  can see". One idea per post, followed all the way down.
- **Opener**: the specific problem or moment — never a generic intro (1–2 short paragraphs).
- **Overview diagram**: REQUIRED right after the opener, before the first code block — an
  architecture/flow, `stateDiagram-v2`, or `sequenceDiagram` that shows the whole system
  at a glance. Diagrams render zoomable (hover controls + fullscreen expand), so make the
  overview a complete map, not a cramped summary.
- **More diagrams**: 1–2 deeper in the post wherever a multi-sentence structural
  explanation would otherwise appear. Wrap every diagram in a triple-backtick `mermaid` block.
- **Code**: real extracts pulled in Step 3 — the interesting part, not boilerplate.
- **Paragraphs**: short (2–4 sentences). Use `###` headers for sections.
- **Ending**: stop when the point is made. No "in conclusion".
- **Title**: keep the long-tail phrase someone would actually search (4+ words), but
  **vary the opening — do not start posts with "How I"**, and make sure no two posts on
  the blog share one formula. Rotate the form to fit the post:
  - **Named tool + what it does** — "wtguard: a 3-layer guard that keeps agents off main"
  - **Result-first claim** — "Shell-style command pipelines in Go, without a shell"
  - **Concrete how** (use sparingly, never twice in a row) — "Composing os/exec with a visitor"

  Avoid the bland category title ("Git worktrees and parallel agents") and avoid the
  uniform "How I X" pattern across the blog. Before finalizing, glance at the existing
  titles in `src/content/posts/` and pick an opening none of them already use.

Fill the frontmatter from the schema at the top: today's date in `+07:00`, an empty
`modDatetime` on first write, accurate kebab-case tags, and a `description` of ≤120
characters that answers "what will I learn?".

---

## Step 5 — Confirm and report

After writing the file:

```bash
ls src/content/posts/<slug>.md && wc -w src/content/posts/<slug>.md
```

Then run the Mermaid parse test so a bad diagram never reaches the build:

```bash
pnpm vitest run src/scripts/mermaidDiagrams.test.ts
```

Report back: **title · slug · tags · word count · whether diagrams were included**.

If the file is missing or the test fails, say so and fix it before claiming done.

---

## Mermaid diagram reference

The blog renders `mermaid` code blocks as inline SVG at build time. Supported diagram
types useful for tech posts:

```mermaid
flowchart LR          # data/control flow, pipeline steps
sequenceDiagram       # request/response between services
stateDiagram-v2       # state machines, lifecycle
graph TD              # dependency graphs, module structure
```

Edge labels containing parentheses must be quoted, or the parser fails:
`A -->|"Write(input)"| B`.

**Use diagrams to replace this kind of prose:**
> "First the request comes in to the handler, which validates it, then passes it to
> the domain layer, which calls the store port, which the Postgres adapter implements."

That sentence is a flowchart waiting to happen. Draw it instead.

---

## SEO checklist

- [ ] Title contains the long-tail phrase someone would search (4+ words, specific)
- [ ] Title opening is distinct from every existing post (no shared "How I" / formula)
- [ ] Description answers "what will I learn?" in ≤120 chars
- [ ] Target phrase appears in the first paragraph
- [ ] At least one internal link to another post (if any exist)
- [ ] Tags are accurate and kebab-case
