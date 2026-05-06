# Threat Model

## Project Overview

Molem is a full-stack Saudi labor-law contract auditor with a Next.js frontend and an Express API backed by PostgreSQL. Authenticated users can register, store employment contracts, upload PDF/DOCX/TXT files, ask legal questions in chat, and trigger Gemini-backed contract analysis that sends contract/chat content to an external AI provider.

Production scope for this scan is the Next.js app in `artifacts/landing` and the Express API in `artifacts/api-server`. `artifacts/mockup-sandbox` is development-only and should be ignored unless production reachability is demonstrated. Generated build artifacts such as `.next/` and `dist/` should be treated as secondary evidence, not primary attack surface, unless they expose a production behavior not visible in source.

Assumptions propagated from platform guidance:
- Production traffic is terminated over TLS by the platform.
- `NODE_ENV` is `production` in production.
- Replit Secrets / environment variables hold deployment secrets.

## Assets

- **User accounts and active session tokens** — compromise allows impersonation and access to private contracts, analyses, and chat history.
- **Uploaded contracts and extracted text** — these documents may contain employment terms, signatures, salaries, IDs, and other sensitive personal or business information.
- **Chat conversations and legal analyses** — reveal sensitive disputes, employment status, and contract weaknesses; tampering or disclosure harms users directly.
- **Application secrets** — `SESSION_SECRET`, database credentials, and Gemini integration secrets protect authentication and backend-to-service trust.
- **AI usage budget and backend availability** — analysis, chat, and file parsing are expensive or CPU/memory intensive; abuse can drive cost spikes or deny service.

## Trust Boundaries

- **Browser → API** — all frontend input is untrusted. The API must authenticate, authorize, validate, and bound every request.
- **API → PostgreSQL** — the API holds broad database access; injection or broken authorization here would expose all user data.
- **API → Gemini integration** — uploaded contracts and chat prompts cross to an external AI provider. Only intended content should be sent, with bounded request sizes and abuse controls.
- **Unauthenticated → Authenticated surface** — `/api/auth/*` and `/api/law/articles` are public; `/api/contracts/*` and `/api/chat/*` are authenticated. This boundary must be enforced server-side.
- **Production → Dev-only artifacts** — `artifacts/mockup-sandbox` and similar experimental code are out of production scope unless routing/build evidence proves otherwise.

## Scan Anchors

- **Production entry points:** `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/*.ts`, `artifacts/landing/app/**`, `artifacts/landing/lib/api.ts`.
- **Highest-risk code areas:** `artifacts/api-server/src/lib/auth.ts`, `artifacts/api-server/src/routes/auth.ts`, `artifacts/api-server/src/routes/contracts.ts`, `artifacts/api-server/src/routes/chat.ts`, `artifacts/api-server/src/lib/analyze.ts`, `artifacts/api-server/src/lib/chat.ts`, `artifacts/api-server/src/lib/pdf.ts`.
- **Public surfaces:** `/api/healthz`, `/api/auth/register`, `/api/auth/login`, `/api/law/articles`.
- **Authenticated surfaces:** `/api/auth/me`, `/api/contracts/*`, `/api/chat/*`, dashboard/contracts frontend routes.
- **Usually ignore:** `artifacts/mockup-sandbox/**`, `artifacts/landing/.next/**`, `artifacts/api-server/dist/**` unless they prove a production-only issue.

## Threat Categories

### Spoofing

Authentication is custom JWT-based, so all protected API routes must require a valid signed token and must treat the browser as untrusted. Session tokens must remain hard to steal, expire within a reasonable period, and not be exposed to unrelated origins or client-side script without a deliberate tradeoff.

### Tampering

Users can submit arbitrary contract text, file uploads, and chat prompts. The server must validate IDs and request bodies, scope all writes to the authenticated user, and ensure model outputs do not silently overwrite or corrupt other users' data.

### Information Disclosure

Contracts, analyses, and chat logs are sensitive. API responses must be scoped per user, logs must not contain auth material, and raw internal errors should not expose provider internals or secret-bearing messages. Content sent to Gemini must be limited to the user’s intended contract/chat data and not accidentally include other tenants’ records.

### Denial of Service

This project has several expensive code paths: bcrypt-backed login, in-memory PDF/DOCX parsing, database-backed article retrieval, and Gemini-backed chat/analysis. Public and authenticated endpoints that trigger these operations must have abuse controls such as rate limits, quotas, deduplication, and bounded payload sizes so one attacker cannot exhaust CPU, memory, model budget, or database capacity.

### Elevation of Privilege

The main privilege boundary is per-user ownership of contracts, analyses, and conversations. Every read, delete, and analysis action must enforce ownership server-side. Numeric IDs must never be sufficient to access another user’s records without a matching `userId` check.
