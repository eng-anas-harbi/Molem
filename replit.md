# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: Next.js 15 + Tailwind CSS v4 + shadcn/ui + Cairo font
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Molem — محلل العقود القانونية

Full-stack Saudi legal contract auditor. Frontend and backend hosted together on Replit.

### Architecture
- `/` → Next.js frontend (`artifacts/landing`, port 18150)
- `/api` → Express backend (`artifacts/api-server`, port 8080)
- Both served via Replit shared reverse proxy on the same domain
- `lib/api.ts` uses relative `/api` URL — no CORS issues in production

### Frontend features (artifacts/landing)
- Chat interface (main page `/`) — legal Q&A with law article citations
- Auth pages (`/login`) — JWT-based with cookie storage
- Dashboard (`/dashboard`) — list & manage contracts
- Contract detail (`/contracts/[id]`) — analysis tabs (summary, rights, alerts, citations)
- New contract (`/contracts/new`) — text paste or PDF/DOCX upload
- About / Contact pages

### Backend features (artifacts/api-server)
- JWT auth (custom, `SESSION_SECRET` + `bcryptjs`)
- PDF/DOCX upload and parsing (`pdf-parse`, `mammoth`) with Arabic visual-order reversal
- Two-pass RAG analysis using Gemini 2.5 Flash:
  1. Pass 1: send contract + article index → model picks relevant article IDs
  2. Pass 2: send full text of selected articles + contract → returns structured JSON
- 524 articles seeded from Saudi Labor Law (227) and Executive Regulations (297)
- CORS allows `*.vercel.app`, `*.replit.dev`, `*.replit.app`, localhost

### API surface (under `/api`)
- `GET  /healthz`
- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `GET  /contracts`, `POST /contracts`, `POST /contracts/upload` (10 MB)
- `GET  /contracts/:id`, `DELETE /contracts/:id`
- `POST /contracts/:id/analyze`
- `GET  /law/articles?q=&source=law|regulation&limit=`
- `POST /chat/messages`, `GET /chat/conversations`, `GET /chat/conversations/:id`, `DELETE /chat/conversations/:id`

### Key files
- `artifacts/landing/` — Next.js frontend (App Router)
- `artifacts/landing/lib/api.ts` — API client using relative `/api` base URL
- `lib/db/src/schema/` — `users`, `contracts`, `contractAnalyses`, `lawArticles`, chat tables
- `lib/api-spec/openapi.yaml` — full OpenAPI spec
- `artifacts/api-server/src/lib/auth.ts` — JWT + bcrypt + `requireAuth` middleware
- `artifacts/api-server/src/lib/analyze.ts` — two-pass Gemini RAG
- `artifacts/api-server/src/lib/chat.ts` — chat with clarifying questions + ⚠️ alerts
- `artifacts/api-server/src/scripts/seedLaw.ts` — seeds `law_articles`

## User preferences

- Arabic UI (RTL), Saudi Labor Law domain
- AI chat asks clarifying questions when context matters
- AI prepends ⚠️ warning when contract has unfair/illegal clauses

## Gotchas

- `artifacts/landing/lib/api.ts` BASE_URL is `/api` (relative) — works for both dev and production
- Next.js dev runs on port 18150 via `$PORT` env var
- Do NOT run `pnpm dev` at workspace root — use `restart_workflow` instead
- Seed law articles: `pnpm --filter @workspace/api-server run seed:law`
