# KaamNow

A platform connecting employers with skilled workers. Built with FastAPI (backend), React (frontend), Expo/React Native (mobile), deployed on Oracle Cloud via Kubernetes.

## Quickstart

```bash
# Backend
cd backend && pip install -r requirements.txt && uvicorn app:app --reload

# Frontend
cd frontend && npm install && npm start

# Mobile
cd mobile && npm install && npx expo start
```

## Codebase Map (graphify)

This project maintains a **live knowledge graph** of all code, docs, and config.
Before touching anything unfamiliar, explore the graph first.

```bash
# In Claude Code chat:
/graphify kaamnow --update        # rebuild after changes
/graphify query "how does auth work"
/graphify explain "DummyDb"
```

Outputs:
- `graphify-out/graph.html` — open in browser, no server needed
- `graphify-out/obsidian/` — open as Obsidian vault
- `graphify-out/GRAPH_REPORT.md` — key nodes, connections, questions

See [CLAUDE.md](CLAUDE.md) for full standards and rules.
