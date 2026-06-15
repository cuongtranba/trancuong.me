---
author: Tran Cuong
pubDatetime: 2026-06-10T10:00:00.000+07:00
modDatetime: 2026-06-15T10:00:00.000+07:00
title: "How I auto-suggest the right Claude Code session resume command in zsh"
featured: false
draft: false
tags: ["zsh", "claude", "productivity"]
description: "A small zsh plugin that turns typing 'claude' into a project-aware --resume suggestion — pure zsh, no jq, no daemon"
---

I restart Claude Code a lot. I jump between projects, close terminals, open new panes, and come back later with only a vague memory that there was already a useful session somewhere.

The default workflow is fine once: run `claude --resume`, pick from a list, continue. After doing that all day it becomes friction in the wrong place. I do not want to think about session IDs. I want the shell to notice that I am standing inside a project directory and offer the most recent session for it.

```mermaid
flowchart LR
  A[user types claude] --> B[autosuggest strategy fires]
  B --> C[_zcr_latest_session]
  C --> D{cache hit?}
  D -- yes --> G[ghost text suggestion]
  D -- no --> E[look up newest session for PWD]
  E --> G
  G --> H[press Right arrow]
  H --> I[claude --resume SESSION_ID]
```

`zsh-claude-resume` is intentionally small: pure zsh, standard POSIX tools, no `jq`, no Python helper, no daemon. It has two jobs — add a `zsh-autosuggestions` strategy so typing `claude` shows the resume command as ghost text, and register tab completion for `claude --resume`.

### The session lookup

The core lookup starts from the current directory. Claude stores project sessions under a path derived from `PWD`, so the plugin turns slashes and dots into dashes and looks there first — behind a short-lived cache, because autosuggestion hooks run on every keystroke.

```zsh
_zcr_latest_session() {
    local now=${EPOCHSECONDS:-$(command date +%s)}
    local cache_val="${_zcr_session_cache[$PWD]}"

    if [[ -n "$cache_val" ]]; then
        local cache_time="${cache_val%% *}"
        local cache_id="${cache_val#* }"
        if (( now - cache_time < ZSH_CLAUDE_RESUME_CACHE_TTL )); then
            print -r -- "$cache_id"
            return
        fi
    fi

    local project_dir="${HOME}/.claude/projects/${PWD//[\/.]/-}"
    local session_id
```

A five-second TTL avoids lag without making the shell feel stale.

### Handling both storage layouts

The plugin handles the two layouts I have seen: newer JSONL files under the project directory, and older PID session files under `~/.claude/sessions`. It tries the cheap path first and falls back only if the project directory does not exist.

```zsh
if [[ -d "$project_dir" ]]; then
    local latest
    latest=$(command ls -t "$project_dir" 2>/dev/null | command grep -vE "^(sessions-index\.json|memory)$" | command head -1)
    [[ -n "$latest" ]] && session_id="${latest%.jsonl}"
fi
```

```mermaid
flowchart TD
  Start[need a session for PWD] --> P{projects dir exists?}
  P -- yes --> J[newest .jsonl is the session ID]
  P -- no --> S[scan ~/.claude/sessions]
  S --> M[match by cwd, newest first]
  J --> Cache[cache result for 5s]
  M --> Cache
```

### Flag detection

I usually run Claude with the same flags in a given project. The plugin scans recent zsh history for the most common plain `claude ...` invocation, so if that was `claude --dangerously-skip-permissions`, the suggestion preserves it.

```zsh
most_common=$(print -r -- "$hist_source" | \
    command grep -E "^claude " | \
    command grep -vE "(--resume|--continue| -r | -c |mcp |doctor|setup|update|config )" | \
    command sed 's/^ *//;s/ *$//' | \
    LC_ALL=C command sort | LC_ALL=C command uniq -c | LC_ALL=C command sort -rn | \
    command head -1 | command sed 's/^ *[0-9]* *//')
```

### The autosuggestion strategy

The suggestion itself is just string matching. If the buffer starts with `claude`, build the best resume candidate and expose it as `suggestion` for `zsh-autosuggestions` to render.

```zsh
_zsh_autosuggest_strategy_claude_resume() {
    typeset -g suggestion=""

    [[ "$1" != claude* ]] && return

    local session_id
    session_id=$(_zcr_latest_session) || return

    local with_flags="claude${_zcr_common_flags} --resume ${session_id}"
    local bare="claude --resume ${session_id}"

    if [[ "$with_flags" == "$1"* ]]; then
        suggestion="$with_flags"
    elif [[ "$bare" == "$1"* ]]; then
        suggestion="$bare"
    fi
}
```

### Setup

Setup is just registration — prepend the strategy to `zsh-autosuggestions` and wire up tab completion:

```zsh
_zcr_detect_flags

if [[ -n "$ZSH_AUTOSUGGEST_STRATEGY" ]] || (( ${+functions[_zsh_autosuggest_strategy_default]} )); then
    ZSH_AUTOSUGGEST_STRATEGY=(claude_resume "${ZSH_AUTOSUGGEST_STRATEGY[@]}")
fi

compdef _zcr_complete_claude claude
```

The result is the kind of tool I like most: it removes one repeated thought. I type `claude`, press right arrow when the suggestion looks right, and I am back in the session that already had the context. It scratches the same itch as [wtguard](/posts/wtguard-parallel-agents), the guard that keeps my parallel agents off `main` — small pieces of a Claude Code setup I keep sharpening.
