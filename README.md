# CodeScope AI

**See your code. Don't just review it.**

AI Code Review Intelligence Platform — paste code, drop a URL, or paste a diff. Get instant security scores, performance audits, dependency risk maps, and AI-powered insights in seconds.

[![Deploy on Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Aayush-coder1/codescope-ai)

---

## What it does

| Mode | What you get |
|------|-------------|
| **Paste Code** | Security + performance scan of any snippet, with line-level findings |
| **Paste Diff** | Full diff analysis — hunks, severity scores, quick-fix suggestions |
| **GitHub URL (repo)** | Complete repo intelligence: folder structure, dependency graph, risk heatmap, security/performance cards, AI executive summary |
| **GitHub URL (PR)** | PR review: merge verdict, critical issues, file-level breakdown, author + repo context |

Every analysis is enriched by **Fireworks AI** (DeepSeek V4 Pro) — generating executive summaries, technical debt callouts, strengths/weaknesses, and suggested improvements, all in real time.

---

## Live Demo

**https://codescope-ai.vercel.app**

Try it now:
- Paste any code snippet (try `eval()` with a hardcoded secret)
- Drop a GitHub repo URL (e.g. `https://github.com/pmndrs/zustand`)
- Drop a GitHub PR URL for a full PR review

---

## Screenshots

> *Add screenshots or GIFs here before final submission*

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | **Next.js 16** (App Router, Turbopack) |
| Language | **TypeScript** |
| Styling | **TailwindCSS v4** |
| Components | **shadcn/ui** |
| Animation | **Framer Motion** |
| Graphs | **React Flow** + **Recharts** |
| AI Engine | **Fireworks AI** — DeepSeek V4 Pro (reasoning off, `reasoning_effort: none`) |
| GitHub API | Native Node.js `https` (no fetch wrapper — avoids Next.js 16 fetch interception) |
| Deployment | **Vercel** / Docker |

---

## Architecture

```
src/
├── app/
│   ├── page.tsx                  # Landing page (3 analysis modes)
│   ├── analyze/[id]/page.tsx     # Dashboard (PR / Repo / Diff routing)
│   └── api/analyze/route.ts      # API entry point — dispatches to analyzers
├── lib/
│   ├── fireworks.ts              # Fireworks AI client (Node https, reasoning_effort: none)
│   ├── github.ts                 # GitHub API (Node https, redirect following, caching)
│   ├── code-analyzer.ts          # Code paste scanner (25+ security patterns)
│   ├── diff-analyzer.ts          # Git diff parser
│   ├── analyzer.ts               # PR analysis engine
│   └── repo-analyzer.ts          # Full repo analyzer (folder structure, dep graph, risk map)
└── components/
    └── dashboard/
        ├── repo-dashboard.tsx     # Master dashboard orchestrator
        ├── stats-bar.tsx          # Dynamic estimated time + mini scores
        ├── security-card.tsx      # Threat level badges, patterns checked
        ├── performance-card.tsx   # Impact badges, files scanned
        ├── risk-heatmap.tsx       # Animated severity bars
        ├── dependency-graph.tsx   # React Flow — risk-colored, glow nodes
        ├── insight-card.tsx       # AI insights (expandable, **bold** headers)
        └── ...
```

---

## Key Technical Decisions

1. **Native `https` over `fetch`** — Next.js 16 wraps `fetch()` globally, breaking external API calls. All external HTTP uses Node.js native `https` module.
2. **`reasoning_effort: "none"`** — Fireworks' DeepSeek V4 Pro defaults to reasoning mode (`high`), which echoes the system prompt in output. Setting `none` gives clean, direct answers.
3. **System-only instructions** — All task instructions live in the system message. User messages contain only raw data. This prevents reasoning models from echoing instructions.
4. **Parallel GitHub fetches** — Repo info, languages, and tree are fetched concurrently. Files are batched in groups of 8 for speed.
5. **Docker ready** — Multi-stage build with standalone output. Works on Vercel, Coolify, or bare metal.

---

## Getting Started (Local)

### Prerequisites

- Node.js 20+
- [Fireworks AI](https://fireworks.ai) API key
- GitHub token (optional — higher rate limits)

### Setup

```bash
git clone https://github.com/Aayush-coder1/codescope-ai.git
cd codescope-ai
npm install
```

Create `.env.local`:

```env
FIREWORKS_API_KEY=fw_...
GITHUB_TOKEN=ghp_...
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Docker

```bash
docker compose up --build
```

Or manually:

```bash
docker build -t codescope-ai .
docker run -p 3000:3000 \
  -e FIREWORKS_API_KEY=fw_... \
  -e GITHUB_TOKEN=ghp_... \
  codescope-ai
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FIREWORKS_API_KEY` | Yes | Fireworks AI API key ([get one here](https://fireworks.ai)) |
| `GITHUB_TOKEN` | No | GitHub PAT for higher rate limits ([create one](https://github.com/settings/tokens)) |

---

## AMD Hackathon — ACT II (Unicorn Track)

Built for the **AMD Developer Hackathon ACT II**, Track 3 — Unicorn Track.

**Tagline:** *See your code. Don't just review it.*

**Judging criteria addressed:**
- **Creativity** — Multi-modal analysis (paste / diff / URL) with interactive dashboards
- **Originality** — AI-enriched repo intelligence, not just linter output
- **Product/Market Potential** — Direct competitor to GitHub Copilot code review; works on any repo, any diff, any snippet
- **Completeness** — Fully functional end-to-end, deployable in one click
- **Meaningful AMD Platform Usage** — Fireworks AI (AMD-accelerated inference) as the core AI engine

---

## License

MIT
