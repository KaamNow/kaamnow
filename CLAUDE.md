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
