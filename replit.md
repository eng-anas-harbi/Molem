# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
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

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Molem Backend

Backend for **Molem** — Saudi legal contract auditor (frontend: https://v0-molem-psau.vercel.app/).

### Features
- JWT auth (custom, `SESSION_SECRET` + `bcryptjs`).
- PDF/DOCX upload and parsing (`pdf-parse`, `mammoth`) with Arabic visual-order reversal for right-to-left PDFs.
- Two-pass RAG analysis using Gemini 2.5 Flash via `@google/genai` Replit AI integration:
  1. Pass 1: send contract + concise index of all law articles → model picks relevant article IDs.
  2. Pass 2: send full text of selected articles + contract → model returns structured JSON (summary, contract type, parties description, employee/employer rights, alerts with severity, citations).
- 524 articles seeded from Saudi Labor Law (227) and its Executive Regulations (297) — `pnpm --filter @workspace/api-server run seed:law`.
- CORS allows `v0-molem-psau.vercel.app`, any `*.vercel.app`, any `*.replit.dev` / `*.replit.app`, and localhost.

### API surface (under `/api`, served on port 8080)
- `GET  /healthz`
- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `GET  /contracts`, `POST /contracts` (JSON), `POST /contracts/upload` (multipart, 10 MB)
- `GET  /contracts/:id`, `DELETE /contracts/:id`
- `POST /contracts/:id/analyze` — runs RAG, returns the analysis row
- `GET  /law/articles?q=&source=law|regulation&limit=`

### Key files
- `lib/db/src/schema/` — `users`, `contracts`, `contractAnalyses`, `lawArticles`.
- `lib/api-spec/openapi.yaml` — full OpenAPI spec (run `codegen` after edits).
- `artifacts/api-server/src/lib/auth.ts` — JWT + bcrypt + `requireAuth` middleware.
- `artifacts/api-server/src/lib/pdf.ts` — PDF/DOCX text extraction with Arabic reversal.
- `artifacts/api-server/src/lib/lawIndex.ts` — cached article index, `getArticlesByIds`, `searchArticles`.
- `artifacts/api-server/src/lib/analyze.ts` — two-pass Gemini RAG.
- `artifacts/api-server/src/scripts/seedLaw.ts` — parses both PDFs and seeds `law_articles`.
