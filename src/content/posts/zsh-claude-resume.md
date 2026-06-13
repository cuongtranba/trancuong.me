---
author: Tran Cuong
pubDatetime: 2026-06-10T10:00:00.000+07:00
modDatetime:
title: "A tiny zsh plugin to resume Claude Code sessions"
featured: false
draft: false
tags: ["zsh", "claude", "productivity"]
description: "The small shell plugin I use so typing claude offers the right resume command."
---

I restart Claude Code a lot. I jump between projects, close terminals, open new panes, and come back later with only a vague memory that there was already a useful session somewhere.

The default workflow is fine once. Run `claude --resume`, pick from a list, continue. After doing that all day, it starts to feel like friction in the wrong place. I do not want to think about session IDs. I want the shell to know that I am standing inside a project directory and offer the most recent session for that directory.

That is what `zsh-claude-resume` does. It is intentionally small: pure zsh, standard POSIX tools, no `jq`, no Python helper, no daemon. The plugin has two jobs. First, it adds a zsh-autosuggestions strategy so typing `claude` can show the resume command as ghost text. Second, it registers tab completion for `claude --resume`.

The core lookup starts with the current directory. Claude stores project sessions under a path derived from `PWD`, so the plugin turns slashes and dots into dashes and looks inside `~/.claude/projects/...`.

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

I added the cache because autosuggestion hooks run constantly while typing. A five-second TTL is enough to avoid lag without making the shell feel stale.

The plugin handles both storage layouts I have seen: newer JSONL files under the project directory, and older PID session files under `~/.claude/sessions`. The first path is cheap:

```zsh
if [[ -d "$project_dir" ]]; then
    local latest
    latest=$(command ls -t "$project_dir" 2>/dev/null | command grep -vE "^(sessions-index\.json|memory)$" | command head -1)
    [[ -n "$latest" ]] && session_id="${latest%.jsonl}"
fi
```

The other small convenience is flag detection. I often run Claude with the same flags in a project, and the plugin scans recent zsh history to find the most common plain `claude ...` invocation. If that command was `claude --dangerously-skip-permissions`, the suggestion preserves it.

```zsh
most_common=$(print -r -- "$hist_source" | \
    command grep -E "^claude " | \
    command grep -vE "(--resume|--continue| -r | -c |mcp |doctor|setup|update|config )" | \
    command sed 's/^ *//;s/ *$//' | \
    LC_ALL=C command sort | LC_ALL=C command uniq -c | LC_ALL=C command sort -rn | \
    command head -1 | command sed 's/^ *[0-9]* *//')
```

The autosuggestion itself is just string matching. If the current buffer starts with `claude`, build the best resume candidate and expose it as `suggestion`.

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

Finally, setup is just registration:

```zsh
_zcr_detect_flags

if [[ -n "$ZSH_AUTOSUGGEST_STRATEGY" ]] || (( ${+functions[_zsh_autosuggest_strategy_default]} )); then
    ZSH_AUTOSUGGEST_STRATEGY=(claude_resume "${ZSH_AUTOSUGGEST_STRATEGY[@]}")
fi

compdef _zcr_complete_claude claude
```

The result is the kind of tool I like most: it removes one repeated thought. I type `claude`, press right arrow when the suggestion looks right, and I am back in the session that already had the context.
