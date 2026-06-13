---
author: Tran Cuong
pubDatetime: 2026-06-13T10:00:00.000+07:00
modDatetime:
title: "Building a Go Library for Managing Subprocesses"
featured: false
draft: false
tags: [go, open-source]
description: "How I built a simple Go library to manage subprocesses with bidirectional I/O communication"
---

I built `subprocess` because I kept needing the same thing in small Go tools: start a command, write to its stdin, read from stdout and stderr, and shut it down without turning every caller into a pile of `os/exec` plumbing.

The standard library already gives Go a solid process API. What I wanted was a smaller surface around the pattern I used most often: long-running child processes where the parent and child keep talking after `Start`.

### The Core Shape

The library is intentionally thin. The important state is the command plus the three pipes that make bidirectional communication possible:

```go
type Process struct {
	cmd    *exec.Cmd
	stdin  io.WriteCloser
	stdout io.ReadCloser
	stderr io.ReadCloser
}
```

That is the whole bias of the package. It does not try to invent a scheduler or a process supervisor. It keeps the `exec.Cmd` model close enough that the behavior is still easy to reason about, then hides the repetitive setup code that I do not want to rewrite in every project.

The constructor follows the same mental model as `exec.Command`: a program name and optional arguments.

```go
func New(name string, args ...string) *Process {
	return &Process{
		cmd: exec.Command(name, args...),
	}
}
```

This keeps the call site boring, which is exactly what I want from infrastructure code. If I need to run `python`, `node`, `bash`, or a project-specific binary, the wrapper should not make that feel like a new domain.

### Starting With Pipes

The most error-prone part is startup. All three pipes must be created before the process starts, and each step can fail. The library keeps that sequence in one place:

```go
func (p *Process) Start() error {
	var err error

	p.stdin, err = p.cmd.StdinPipe()
	if err != nil {
		return err
	}

	p.stdout, err = p.cmd.StdoutPipe()
	if err != nil {
		return err
	}

	p.stderr, err = p.cmd.StderrPipe()
	if err != nil {
		return err
	}

	return p.cmd.Start()
}
```

I like this kind of abstraction because it removes ceremony without hiding the operating system. A subprocess can still fail to start. Pipes can still fail. The caller still has to decide what failure means. The library just makes the happy path and the cleanup path more consistent.

### Communication As The Main API

The reason this package exists is not one-shot command execution. Go already has `cmd.Output()` and `cmd.CombinedOutput()` for that. The useful case is when a process stays alive and accepts input over time.

```go
func (p *Process) Write(input string) error {
	_, err := io.WriteString(p.stdin, input)
	return err
}
```

That small method changes the feeling of the caller. Instead of carrying a `WriteCloser` around or leaking details of how the process was started, the caller talks to the child through the process object.

Reading follows the same idea. The process exposes stdout and stderr as streams, so callers can choose whether they want scanners, readers, goroutines, or their own parsing logic:

```go
func (p *Process) Stdout() io.Reader {
	return p.stdout
}

func (p *Process) Stderr() io.Reader {
	return p.stderr
}
```

I prefer returning `io.Reader` here because it keeps the package flexible. A line-oriented command can use `bufio.Scanner`. A protocol-like command can use a custom decoder. Tests can consume the stream directly.

### Keeping Shutdown Explicit

Subprocess code becomes painful when lifecycle is vague. I wanted the package to make shutdown visible, not magical.

```go
func (p *Process) Wait() error {
	return p.cmd.Wait()
}

func (p *Process) Kill() error {
	return p.cmd.Process.Kill()
}
```

There is a tradeoff in keeping the library small: it does not pretend to know every caller's lifecycle policy. Some tools should wait for EOF. Some should kill the child on timeout. Some should drain stderr in a goroutine. The package gives me the pieces I need for those decisions without forcing a framework around them.

That is the kind of Go library I enjoy maintaining: a narrow wrapper over a real primitive, written to make the common case readable while leaving the sharp edges visible enough that I do not forget they exist.
