---
name: blog-writer
description: >
  Write a new blog post for trancuong.me. Trigger whenever the user wants to write,
  draft, create, or add a post — including "new post", "write about X", "post about
  my repo", "blog post idea", or "write something about [topic]". Handles topic
  sharpening, long-tail angle, structure planning with Mermaid diagrams, and delegates
  the actual writing to the Codex agent which pulls real code from GitHub repos.
user-invocable: true
---

# Blog Writer — trancuong.me

You are helping Tran Cuong write a post for his personal technical blog. Posts live
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

Before invoking Codex, build a mental outline. Every post needs:

1. **An opener that earns attention** — start with the specific pain point, the moment
   something broke, or the surprising finding. Never open with "Go is a great language
   for..." or any hollow generalization.

2. **Mermaid diagrams where a wall of text would form** — the blog supports Mermaid
   natively via `rehype-mermaid`. Use diagrams to replace explanations of:
   - **Flow / sequence** — how data or control moves through a system
   - **State machines** — how a component transitions between states
   - **Architecture** — how modules/services relate

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

3. **Real code snippets** from the actual repo — short, focused extracts that prove
   the point. Not toy examples.

4. **Short paragraphs** — 2–4 sentences max. This is a technical blog, not a textbook.
   Write like you're explaining to a colleague over coffee.

5. **A direct ending** — stop when the thought ends. No "in conclusion", no "I hope
   this was helpful".

---

## Step 3 — Build the Codex prompt

Construct this exact prompt (fill in placeholders):

```
Write a blog post for trancuong.me.

TOPIC: <specific angle, not just a subject>
REPOS: <cuongtranba/repo-name> — explore with:
  gh api /repos/cuongtranba/<name>/git/trees/HEAD?recursive=1 --jq '.tree[].path'
  gh api /repos/cuongtranba/<name>/contents/<path> --jq '.content' | base64 -d
TAGS: <1-3 kebab-case tags>
SLUG: <kebab-case-filename-no-date>
FEATURED: false

FRONTMATTER (use exactly):
---
author: Tran Cuong
pubDatetime: <today ISO 8601 +07:00>
modDatetime:
title: "<title — should read like a search query someone would actually type>"
featured: false
draft: false
tags: [<tags>]
description: "<one sentence, ≤120 chars, answers 'what will I learn?'>"
---

WRITING RULES:
- First-person voice (I, my, we)
- 500–800 words
- Open with the specific problem or moment — never a generic opener
- Include 1–2 Mermaid diagrams (flowchart or stateDiagram-v2) where they replace
  a multi-sentence structural explanation. Wrap in triple-backtick mermaid blocks.
- Pull real code from the repo using gh api. Show the interesting part, not boilerplate.
- Short paragraphs (2–4 sentences). Use ### headers for sections (renders italic).
- No "in conclusion". End when the point is made.
- The title should be what someone would actually type into Google:
  e.g. "How I stopped parallel agents from trampling main with wtguard"
  not "Git worktrees and parallel agents"

SAVE TO: /home/cuong/repo/trancuong.me/src/content/posts/<slug>.md
```

---

## Step 4 — Invoke Codex

Use the `Agent` tool with **`subagent_type: "codex:codex-rescue"`**.

Start the prompt with `--fresh` so Codex opens a new thread.

---

## Step 5 — Confirm and report

After Codex completes:

```bash
ls /home/cuong/repo/trancuong.me/src/content/posts/<slug>.md && \
  wc -w /home/cuong/repo/trancuong.me/src/content/posts/<slug>.md
```

Report back: **title · slug · tags · word count · whether diagrams were included**.

If the file is missing, say so and offer to retry.

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

**Use diagrams to replace this kind of prose:**
> "First the request comes in to the handler, which validates it, then passes it to
> the domain layer, which calls the store port, which the Postgres adapter implements."

That sentence is a flowchart waiting to happen. Draw it instead.

---

## SEO checklist (Codex should follow these)

- [ ] Title contains the long-tail phrase someone would search (4+ words, specific)
- [ ] Description answers "what will I learn?" in ≤120 chars
- [ ] Target phrase appears in the first paragraph
- [ ] At least one internal link to another post (if any exist)
- [ ] Tags are accurate and kebab-case
