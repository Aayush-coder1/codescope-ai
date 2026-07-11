# CodeScope AI

AI Code Review Intelligence Platform. See your code. Don't just review it.

## Features

- **Repository Analysis** — Full codebase intelligence with security, complexity, performance scores
- **PR Review** — Automated pull request review with merge verdict
- **Git Diff Analysis** — Paste a diff for instant review
- **Code Paste** — Paste code snippets for quick analysis
- **AI Insights** — Fireworks AI-powered technical debt, strengths, weaknesses, improvements
- **Interactive Dashboard** — Risk heatmap, dependency graph, security/performance cards

## Tech Stack

Next.js 16, TypeScript, TailwindCSS v4, shadcn/ui, Framer Motion, React Flow, Recharts, Fireworks AI

## Getting Started

### Prerequisites

- Node.js 20+
- Fireworks AI API key (get one at [fireworks.ai](https://fireworks.ai))
- GitHub token (optional, for higher rate limits)

### Setup

```bash
npm install
cp .env.example .env.local   # or create manually
```

Add your API keys to `.env.local`:

```
FIREWORKS_API_KEY=fw_...
GITHUB_TOKEN=ghp_...
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Docker

### Quick Start

```bash
docker compose up --build
```

### Build and Run Manually

```bash
docker build -t codescope-ai .
docker run -p 3000:3000 \
  -e FIREWORKS_API_KEY=fw_... \
  -e GITHUB_TOKEN=ghp_... \
  codescope-ai
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FIREWORKS_API_KEY` | Yes | Fireworks AI API key for code analysis |
| `GITHUB_TOKEN` | No | GitHub personal access token for higher API limits |

## Production Build

```bash
npm run build
npm start
```

## License

MIT
