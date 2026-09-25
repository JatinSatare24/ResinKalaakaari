# Resin Kalaakari — Architecture

This document tracks the app's architecture as it's reviewed and refactored,
phase by phase (see project review plan). Each phase extends the diagram
below rather than replacing it, so by the final phase it reflects the full
end-to-end flow of the app.

## Diagram

\`\`\`mermaid
flowchart LR
    Browser[Browser] --> Vercel[Vercel]
\`\`\`

## Phase log

| Phase | Status | Notes |
|-------|--------|-------|
| Repo setup (CI/CD) | Done | CI workflow (lint/format/type-check/build), branch protection on `main`, Vercel previews confirmed on PRs |
| 1 — Foundation | Not started | |
| 2 — Auth | Not started | |
| 3 — Products | Not started | |
| 4 — Home | Not started | |
| 5 — Cart | Not started | |
| 6 — Orders | Not started | |
| 7 — Admin | Not started | |
| 8 — Edge function | Not started | |