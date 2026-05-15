# KaamNow — Claude Code Standards

## FIRST ACTION (mandatory)

**Before doing anything else in this project**, read the knowledge graph report:

```
graphify-out/GRAPH_REPORT.md
```

This is non-negotiable. The graph is the team's canonical map of the codebase (723 nodes, 1162 edges, 85 communities). You will not understand what you're touching without it. Read it, then proceed.

---

## Knowledge Graph (graphify)

This project uses **graphify** to maintain a persistent knowledge graph of the codebase.
The graph lives in `graphify-out/` and is the canonical way to understand how the code fits together.

### Outputs
- `graphify-out/graph.html` — interactive visualization, open in any browser
- `graphify-out/obsidian/` — open as a vault in Obsidian (File > Open Vault)
- `graphify-out/GRAPH_REPORT.md` — god nodes, surprising connections, suggested questions
- `graphify-out/graph.json` — persistent graph for programmatic queries

### Rules for all developers and AI agents

1. **Before starting any non-trivial task**, run `/graphify query "<your question>"` to understand what you're touching.
2. **After adding or modifying files**, run `/graphify kaamnow --update` to keep the graph current.
3. **Never delete `graphify-out/`** — it is the team's shared map of the codebase.
4. The git post-commit hook auto-rebuilds the graph for code changes. For doc/config changes, run `--update` manually.

### Key concepts this graph reveals
- `DummyDb` / `DummyCollection` / `DummyCursor` are the test mock layer — tightly coupled to production schemas. Any schema change must be reflected in tests.
- `cn()` is the single utility holding the entire frontend component library together (25 edges across 11 UI communities).
- `Settings` bridges config, the API core, and the test layer — it is load-bearing.

### Useful commands
```
/graphify kaamnow                        # full rebuild
/graphify kaamnow --update               # incremental (new/changed files only)
/graphify query "how does auth work"     # explore a topic
/graphify path "WhatsApp" "Booking"      # trace a connection
/graphify explain "DummyDb"              # deep-dive a node
```

---

## ROLES (strict — never swap)

**Claude = architect and planner only. Never writes application code.**
**Codex = senior developer. Does all implementation.**

---

## WORKFLOW

### Step 1 — Claude plans (query graphify, never read files speculatively)

Before reading any source file, run:
```
/graphify query "<task description>"
```
Read only the files the graph identifies — maximum 4 files. Write the plan to `.claude/plans/current_plan.md`:

```
TASK: <one-line description>
FILES_AFFECTED: <comma-separated file paths from graph output>
GOD_NODES_TOUCHED: <none | DummyDb | cn() | Settings | run()>
STEPS:
1. <concrete change with file path and function name>
2. ...
CODEX_PROMPT: Read graphify-out/GRAPH_REPORT.md first to understand the codebase (723 nodes, 85 communities). Key files: <list>. God nodes involved: <list or none>. Then implement: <full task — specific file paths, function names, what to add/change/remove>
```

Call ExitPlanMode. Tell the user: "Plan ready. Type **approve** to start Codex."

### Step 2 — Codex codes (automated on approval)

When the user types approve / go / yes / run:
1. Write `APPROVED` to `.claude/plans/approval.flag`
2. The Stop hook triggers Codex automatically — do nothing else

Codex reads the plan, loads the graph report, and implements everything.

### Step 3 — Done

Codex's changes land as unstaged files (any auto-commits are soft-reset by the hook). The user reviews the diff in VS Code and commits when satisfied.

---

## HARD RULES

- Claude **never** calls Edit, Write, or MultiEdit on `backend/`, `frontend/`, or `mobile/` files
- Always run `/graphify query` before reading any file
- Never use `find` or `grep` to explore — the graph answers those questions cheaper
- After any code change (by Codex), run `/graphify kaamnow --update` to keep the graph current
