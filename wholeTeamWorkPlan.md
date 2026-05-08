# Nayanta AI — Project Constitution
### Hackathon Working Plan | 4-Person Team | 24 Hours

> **One rule above all:** `schemas/index.ts` is written at Hour 0 and is immutable after Hour 1. Every person imports from it. Nobody defines their own types.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Repository Structure](#2-repository-structure)
3. [Team Ownership Map](#3-team-ownership-map)
4. [Person 1 — Backend Infrastructure + DevOps + Integration](#4-person-1--backend-infrastructure--devops--integration)
5. [Person 2 — AI Agents + External Integrations](#5-person-2--ai-agents--external-integrations)
6. [Person 3 — Data Layer + Intelligence Engine](#6-person-3--data-layer--intelligence-engine)
7. [Person 4 — Frontend](#7-person-4--frontend)
8. [Shared Contracts — schemas/index.ts](#8-shared-contracts--schemasindexts)
9. [API Contract](#9-api-contract)
10. [Integration Protocol](#10-integration-protocol)
11. [Security Implementation](#11-security-implementation)
12. [Error Handling and Failure Strategy](#12-error-handling-and-failure-strategy)
13. [Timeline and Milestones](#13-timeline-and-milestones)
14. [Demo Seed Data](#14-demo-seed-data)
15. [Environment Variables](#15-environment-variables)
16. [Risk Register](#16-risk-register)

---

## 1. Project Overview

**Nayanta AI** is an end-to-end AI-powered scholarship navigation platform for underprivileged Indian students. It does not list scholarships. It executes the entire scholarship journey — discovery, document validation, application drafting, submission, tracking, rejection recovery — autonomously, in the student's language.

**Core problem:** Over 3,500 crore rupees in scholarships go unclaimed every year in India. Not due to ineligibility. Due to documentation failures, system complexity, language barriers, and zero post-application support.

**What Nayanta does that nobody else does:** Takes a student from zero awareness to funded. Completely. Without requiring the student to understand the bureaucratic system at all.

**Tech foundation:** Google ADK + Gemini 1.5 Flash + Cloud Run + Firebase + BullMQ + Qdrant.

---

## 2. Repository Structure

Single monorepo. One GitHub repository. Four clearly separated workspaces.

```
nayanta-ai/
├── backend/
│   ├── src/
│   │   ├── server.ts
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── config/
│   │   ├── queue/
│   │   ├── schemas/
│   │   │   └── index.ts          # SINGLE SOURCE OF TRUTH — Person 1 authors at Hour 0
│   │   ├── agents/               # Person 2
│   │   ├── orchestrator/         # Person 2
│   │   ├── services/             # Person 2
│   │   ├── validation/           # Person 2
│   │   ├── data/                 # Person 3
│   │   ├── intelligence/         # Person 3
│   │   └── rag/                  # Person 3
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── .env.example
│   ├── tsconfig.json
│   ├── package.json
│   └── cloudbuild.yaml
├── frontend/
│   ├── src/
│   │   ├── pages/                # Person 4
│   │   ├── components/           # Person 4
│   │   ├── context/              # Person 4
│   │   ├── hooks/                # Person 4
│   │   ├── types/
│   │   │   └── index.ts          # Mirror of backend schemas/index.ts
│   │   └── lib/
│   │       └── api.ts            # Axios client
│   ├── public/
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
├── .github/
│   └── workflows/
│       ├── backend-ci.yml
│       └── frontend-ci.yml
└── README.md
```

**Branch strategy:**

```
main           → protected, only merges via PR
dev            → integration branch, all PRs target this
feature/p1-*   → Person 1 branches
feature/p2-*   → Person 2 branches
feature/p3-*   → Person 3 branches
feature/p4-*   → Person 4 branches
```

---

## 3. Team Ownership Map

| Domain | Owner | Files They Touch |
|---|---|---|
| Backend infra, Express, middleware, queues, DevOps, CI/CD, deployment, final integration | Person 1 | `backend/src/server.ts`, `routes/`, `middleware/`, `config/`, `queue/`, `schemas/index.ts`, `Dockerfile`, `docker-compose.yml`, `cloudbuild.yaml` |
| All 7 AI agents, ADK orchestration, Gemini wrappers, external integrations, PDF generation, state machine | Person 2 | `backend/src/agents/`, `orchestrator/`, `services/`, `validation/` |
| Scholarship database, rule engine, conflict detector, stack optimizer, RAG pipeline, seed data | Person 3 | `backend/src/data/`, `intelligence/`, `rag/` |
| All frontend pages, components, contexts, hooks, PWA, i18n layer | Person 4 | `frontend/src/` entirely |

**Hard rule:** Nobody touches another person's folder without a PR and explicit approval from that person.

---

## 4. Person 1 — Backend Infrastructure + DevOps + Integration

### Stack

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | 20 LTS |
| Language | TypeScript | 5.x |
| Framework | Express.js | 4.x |
| Auth | Firebase Admin SDK | Latest |
| Database | Firestore | Firebase v10 |
| Queue | BullMQ | 5.x |
| Cache | Redis (Upstash free tier) | 7.x |
| Storage | Google Cloud Storage | Latest |
| Secrets | Google Secret Manager | Latest |
| Containerization | Docker | Latest |
| Deployment | Google Cloud Run | — |
| CI/CD | GitHub Actions | — |
| Validation | Zod | 3.x |
| Security | Helmet.js | Latest |
| Rate Limiting | express-rate-limit | Latest |

### Folder Ownership

```
backend/
├── src/
│   ├── server.ts
│   ├── routes/
│   │   ├── profile.routes.ts
│   │   ├── eligibility.routes.ts
│   │   ├── documents.routes.ts
│   │   ├── drafting.routes.ts
│   │   ├── tracking.routes.ts
│   │   ├── rejection.routes.ts
│   │   ├── family.routes.ts
│   │   ├── admin.routes.ts
│   │   └── health.routes.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── rateLimit.middleware.ts
│   │   ├── validate.middleware.ts
│   │   ├── errorHandler.middleware.ts
│   │   ├── cors.middleware.ts
│   │   ├── security.middleware.ts
│   │   └── piiMasker.middleware.ts
│   ├── config/
│   │   ├── firestore.config.ts
│   │   ├── redis.config.ts
│   │   ├── storage.config.ts
│   │   └── secrets.config.ts
│   ├── queue/
│   │   ├── QueueManager.ts
│   │   ├── deadLetter.ts
│   │   └── processors/
│   │       ├── profile.processor.ts
│   │       ├── eligibility.processor.ts
│   │       ├── documents.processor.ts
│   │       ├── drafting.processor.ts
│   │       ├── tracking.processor.ts
│   │       ├── rejection.processor.ts
│   │       └── family.processor.ts
│   └── schemas/
│       └── index.ts
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── tsconfig.json
└── cloudbuild.yaml
```

### What Person 1 Builds — Complete Checklist

**Hour 0 (mandatory before anyone starts):**
- Write `schemas/index.ts` with all TypeScript interfaces — coordinate with Person 2 on agent I/O shapes
- Commit and push — all others pull immediately

**Express Server:**
- `server.ts` — Express app instantiation, middleware stack registration, route mounting, graceful shutdown handler
- Full middleware stack applied in this exact order: Helmet → CORS → JSON body parser → Rate limiter → Firebase Auth → Zod validation → Routes → Error handler

**Middleware Stack:**
- `auth.middleware.ts` — Firebase ID token verification, attaches `req.user` to every authenticated request, returns 401 on invalid/expired token
- `rateLimit.middleware.ts` — per-endpoint limits (see Security section), per-IP and per-user sliding window
- `validate.middleware.ts` — generic Zod validation wrapper, accepts schema as parameter, short-circuits with 422 on invalid input
- `errorHandler.middleware.ts` — catches all thrown errors, formats into standard error shape, never exposes stack traces in production
- `cors.middleware.ts` — whitelist-only origin config, preflight handler
- `security.middleware.ts` — Helmet with custom CSP, HSTS with preload, X-Frame-Options DENY
- `piiMasker.middleware.ts` — masks Aadhaar, phone, bank account numbers before any logging

**API Routes (stub first, real logic plugged in at integration):**

Every route follows this pattern:
```typescript
router.post('/endpoint', authenticate, rateLimiter('endpoint'), validate(EndpointSchema), async (req, res, next) => {
  try {
    const job = await queueManager.enqueue('agentQueue', req.body);
    res.status(202).json({ success: true, jobId: job.id });
  } catch (error) {
    next(error);
  }
});
```

Routes to implement:
- `POST /api/profile/submit` — enqueue ProfileAgent job
- `POST /api/eligibility/check` — enqueue EligibilityAgent job
- `POST /api/eligibility/stack` — enqueue StackOptimizer job
- `POST /api/documents/validate` — enqueue DocIntelligenceAgent job
- `GET /api/documents/checklist/:schemeId` — return document requirements for scheme
- `POST /api/draft/application` — enqueue DraftingAgent job
- `GET /api/draft/:applicationId` — return drafted application from Firestore
- `GET /api/track/:applicationId` — return application state + steps
- `POST /api/track/confirm-receipt` — confirm disbursal received
- `POST /api/rejection/analyze` — enqueue RejectionAgent job
- `POST /api/family/map` — enqueue FamilyMapperAgent job
- `GET /api/jobs/:jobId/status` — poll job completion status
- `GET /api/health` — system health, agent status, queue depths
- `GET /api/admin/stats` — aggregate stats for admin dashboard
- `GET /api/admin/applications` — all applications with filters

**BullMQ Queue Architecture:**
- `QueueManager.ts` — initializes one queue per agent (7 queues), exposes `enqueue()`, `getJobStatus()`, `getQueueHealth()`
- Each queue: 3 retry attempts, exponential backoff (1s, 4s, 16s), dead letter queue on final failure
- `deadLetter.ts` — listens for failed jobs, writes to Firestore `/dead_letter` collection, sends alert
- Job processors: each processor imports the corresponding agent function from Person 2 and calls it

**Config Layer:**
- `firestore.config.ts` — Firestore client with service account from Secret Manager
- `redis.config.ts` — Redis client with connection pooling, reconnect on failure
- `storage.config.ts` — Cloud Storage client, signed URL generator (1-hour expiry)
- `secrets.config.ts` — Secret Manager wrapper, caches secrets in memory for 5 minutes

**DevOps:**

`Dockerfile`:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 8080
CMD ["node", "dist/server.js"]
```

`docker-compose.yml` — all 4 team members use this for local dev:
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports: ["8080:8080"]
    environment:
      - NODE_ENV=development
    env_file: ./backend/.env
    depends_on: [redis]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
  qdrant:
    image: qdrant/qdrant
    ports: ["6333:6333"]
    volumes: ["qdrant_data:/qdrant/storage"]
volumes:
  qdrant_data:
```

`cloudbuild.yaml` — triggers on push to `main`, builds Docker image, pushes to GCR, deploys to Cloud Run with minScale: 1

**GitHub Actions CI/CD:**
- `backend-ci.yml` — on PR to `dev`: `npm ci` → `npm run lint` → `npm run build` → `npm test`
- `frontend-ci.yml` — on PR to `dev`: `npm ci` → `npm run lint` → `npm run build`

**Final Integration (Hours 17–20):**
- Import Person 2's agent functions into each queue processor
- Verify all input/output shapes match `schemas/index.ts`
- Run full Priya Sharma journey end-to-end
- Fix all integration errors
- Deploy to Cloud Run production
- Verify health endpoint green

### Deliverables to Others

| Deliverable | Who Needs It | When |
|---|---|---|
| `schemas/index.ts` committed | Everyone | Hour 0 |
| `docker-compose.yml` committed | Everyone | Hour 0 |
| `.env.example` with all required vars | Everyone | Hour 0 |
| Cloud Run stub URL live | Person 4 | Hour 3 |
| All stub endpoints returning valid shapes | Person 4 | Hour 3 |

---

## 5. Person 2 — AI Agents + External Integrations

### Stack

| Component | Technology |
|---|---|
| Agent Framework | Google ADK + LangGraph |
| Core LLM | Gemini 1.5 Flash |
| Vision | Gemini Vision API |
| Embeddings | text-embedding-004 |
| Notifications | Twilio WhatsApp SDK |
| Voice Calls | Exotel API |
| Document Pull | DigiLocker API (mock for demo) |
| Grievance Filing | CPGRAMS API (mock for demo) |
| PDF Generation | pdfkit |
| Document Parsing | pdf-parse |

### Folder Ownership

```
backend/src/
├── agents/
│   ├── BaseAgent.ts
│   ├── ProfileAgent.ts
│   ├── DiscoveryAgent.ts
│   ├── DocIntelligenceAgent.ts
│   ├── DraftingAgent.ts
│   ├── TrackingAgent.ts
│   ├── RejectionAgent.ts
│   └── FamilyMapperAgent.ts
├── orchestrator/
│   ├── AgentOrchestrator.ts
│   └── StateMachine.ts
├── services/
│   ├── gemini.service.ts
│   ├── geminiVision.service.ts
│   ├── whatsapp.service.ts
│   ├── digilocker.service.ts
│   ├── cpgrams.service.ts
│   ├── exotel.service.ts
│   └── pdf.service.ts
└── validation/
    ├── DocumentValidator.ts
    └── layers/
        ├── CrossDocConsistency.ts
        ├── FreshnessValidator.ts
        ├── AuthorityValidator.ts
        ├── FaceMatch.ts
        ├── DigitalSignature.ts
        ├── AddressConsistency.ts
        └── QRBarcodeValidator.ts
```

### What Person 2 Builds — Complete Checklist

**BaseAgent.ts — Abstract Base Class:**
```typescript
abstract class BaseAgent<TInput, TOutput> {
  abstract run(input: TInput): Promise<TOutput>;
  abstract fallbackResponse(input: TInput): TOutput;

  async execute(input: TInput): Promise<TOutput> {
    return this.withRetry(() => this.run(input), { attempts: 3, backoff: 'exponential' });
  }

  private async withRetry(fn, options): Promise<TOutput> { ... }
  protected async logAction(agentName: string, input: unknown, output: unknown): Promise<void> { ... }
  protected async writeAuditTrail(entry: AuditEntry): Promise<void> { ... }
}
```

**ProfileAgent.ts:**
- Input: Raw form fields (name, DOB, income, category, state, course, institute)
- Calls Gemini Flash to normalize and validate — extracts structured profile even from messy input
- Writes `UserProfile` to Firestore `/users/{userId}`
- Output: `ProfileAgentOutput` with structured `UserProfile` + validation flags

**DiscoveryAgent.ts:**
- Input: `UserProfile`
- Step 1: Calls Person 3's `getEligibleScholarships(profile)` — deterministic rule engine match
- Step 2: For borderline matches (`requiresGeminiEvaluation: true`), calls Gemini Flash for nuanced reasoning
- Step 3: Retrieves RAG context from Qdrant for top matches (scheme rubrics, success patterns)
- Step 4: Scores + ranks all matches, generates plain-language eligibility reasons per scheme
- Output: `DiscoveryAgentOutput` with ranked `MatchedScholarship[]`, each with score, reasons, and success probability

**DocIntelligenceAgent.ts:**
- Input: `DocumentUpload[]` + `schemeIds[]`
- Calls `DocumentValidator.ts` which runs all 7 layers sequentially
- Gemini Vision handles: face match, OCR extraction, QR validation, digital signature check
- Each layer returns: `{ passed: boolean, message: string, severity: 'error' | 'warning' }`
- Output: `DocAgentOutput` with per-document results, overall health score (0–100), actionable fix list

**7 Document Validation Layers:**
- `CrossDocConsistency.ts` — compares name, DOB, address across all uploaded documents via Gemini Vision OCR
- `FreshnessValidator.ts` — checks issue date of each document against scheme-specific validity window
- `AuthorityValidator.ts` — verifies issuing authority name/stamp matches expected format for that document type
- `FaceMatch.ts` — Gemini Vision compares Aadhaar photo against live selfie, returns match confidence
- `DigitalSignature.ts` — checks for presence and validity of digital signatures where required
- `AddressConsistency.ts` — verifies address fields are consistent across all documents
- `QRBarcodeValidator.ts` — extracts and validates embedded QR/barcode data against printed text

**DraftingAgent.ts:**
- Input: `UserProfile` + `MatchedScholarship` + `ValidatedDocuments`
- Fetches scheme rubric from Qdrant RAG (what evaluators score for)
- Fetches successful application patterns from knowledge base
- Builds structured Gemini prompt: profile data + scheme requirements + rubric + success patterns
- Calls Gemini Flash → structured application text (not freeform prose)
- Calls `pdf.service.ts` to generate submission-ready PDF
- Output: `DraftingAgentOutput` with `applicationText`, `coverLetter`, `pdfUrl`, `translatedSummary`

**TrackingAgent.ts:**
- Input: `applicationId`
- Polls NSP portal status (mock for demo — returns realistic state progression)
- Monitors PFMS for disbursement events
- On every state change: calls `whatsapp.service.ts` to notify student
- Sets deadline reminder jobs in BullMQ (30-day auto-grievance trigger)
- Output: `TrackingAgentOutput` with current state, step history, next expected action

**RejectionAgent.ts:**
- Input: rejection letter (text or PDF) + original application context
- Gemini Flash reads rejection letter, extracts rejection reason in structured format
- Cross-references against known rejection patterns in knowledge base
- Generates plain-language explanation (no bureaucratic jargon)
- Calls `cpgrams.service.ts` to auto-file grievance with structured evidence
- Rebuilds corrected application with flagged fields fixed
- Output: `RejectionAgentOutput` with `rejectionReason`, `fixedApplication`, `grievanceId`, `legalNoticeDraft`

**FamilyMapperAgent.ts:**
- Input: household member details (age, course, category, income source)
- Runs DiscoveryAgent logic for each household member independently
- Deduplicates and ranks household-level scholarship stack
- Output: `FamilyAgentOutput` with per-member matches + combined household opportunity value

**AgentOrchestrator.ts:**
- LangGraph pipeline wiring the standard flow: Profile → Discovery → DocIntelligence → Drafting → Tracking
- Each node in the graph corresponds to one agent
- State is persisted to Firestore at each transition — resume from last step on failure
- Exposes `runPipeline(userId, input)` entry point

**StateMachine.ts:**
- Defines all valid state transitions
- Enforces no illegal transitions
- Writes every transition to Firestore with timestamp

```
States:
PENDING → PROFILED → DISCOVERED → DOCS_PENDING → VALIDATING →
DRAFTING → REVIEW → SUBMITTED → TRACKING → RECEIVED |
REJECTED → GRIEVANCE_FILED → RESOLVED | RENEWAL_DUE
```

**Services:**

`gemini.service.ts`:
- Wraps Gemini 1.5 Flash API calls
- Always requests structured JSON output via `responseMimeType: 'application/json'`
- Validates response against expected Zod schema before returning
- Fallback: returns cached response if API is unavailable
- Retry: 3 attempts with exponential backoff on rate limit or 5xx

`geminiVision.service.ts`:
- Wraps Gemini Vision API for document analysis
- Accepts base64 image or Cloud Storage signed URL
- Returns structured OCR output, face match result, QR data

`whatsapp.service.ts`:
- Twilio WhatsApp Sandbox integration
- Sends templated status update messages at each application state change
- Fallback to SMS via Exotel if WhatsApp fails

`digilocker.service.ts`:
- Mock for demo — returns realistic document JSON for Aadhaar, income certificate, marksheet
- Real OAuth flow documented and stubbed — easy to activate post-hackathon

`cpgrams.service.ts`:
- Mock for demo — generates realistic grievance reference number
- Real API integration stubbed and documented

`exotel.service.ts`:
- Schedules follow-up voice call with CSC officer
- Returns call confirmation with scheduled time

`pdf.service.ts`:
- Uses pdfkit to generate scholarship application PDF
- Fills form fields from structured application data
- Returns Cloud Storage URL of generated PDF (signed, 1-hour expiry)

### Exported Contract (what Person 1 calls)

```typescript
export async function runProfileAgent(input: ProfileAgentInput): Promise<ProfileAgentOutput>
export async function runDiscoveryAgent(input: DiscoveryAgentInput): Promise<DiscoveryAgentOutput>
export async function runDocIntelligenceAgent(input: DocAgentInput): Promise<DocAgentOutput>
export async function runDraftingAgent(input: DraftingAgentInput): Promise<DraftingAgentOutput>
export async function runTrackingAgent(input: TrackingAgentInput): Promise<TrackingAgentOutput>
export async function runRejectionAgent(input: RejectionAgentInput): Promise<RejectionAgentOutput>
export async function runFamilyMapperAgent(input: FamilyAgentInput): Promise<FamilyAgentOutput>
```

**Person 2 never touches:** Express routes, Firestore config, Redis, Docker, queue setup, frontend.

**Person 2's only dependency:** `schemas/index.ts` from Person 1.

---

## 6. Person 3 — Data Layer + Intelligence Engine

### Stack

| Component | Technology |
|---|---|
| Language | TypeScript (Node.js 20) |
| Vector Store | Qdrant (via docker-compose) |
| Embeddings | Gemini text-embedding-004 |
| Document Parsing | pdf-parse |
| Database | Firestore |

### Folder Ownership

```
backend/src/
├── data/
│   ├── scholarships/
│   │   ├── master.json
│   │   ├── central.json
│   │   ├── state.json
│   │   └── csr.json
│   ├── csc-locator/
│   │   └── districts.json
│   └── seed/
│       ├── priya-sharma.json
│       └── seed.ts
├── intelligence/
│   ├── RuleEngine.ts
│   ├── ConflictDetector.ts
│   ├── StackOptimizer.ts
│   ├── SuccessProbability.ts
│   ├── QuotaTracker.ts
│   ├── ScamDetector.ts
│   ├── InstituteVerifier.ts
│   └── BankValidator.ts
└── rag/
    ├── QdrantClient.ts
    ├── Embedder.ts
    ├── SchemeIndexer.ts
    └── Retriever.ts
```

### What Person 3 Builds — Complete Checklist

**Scholarship Database (master.json and category files):**

Each scholarship entry must follow this exact schema:
```json
{
  "id": "nsp-central-2024",
  "name": "National Scholarship Portal — Central Sector Scheme",
  "category": "central",
  "cohort": "student",
  "eligibility": {
    "minMarks": 80,
    "maxIncome": 450000,
    "categories": ["general", "sc", "st", "obc"],
    "minClass": 11,
    "maxClass": "pg",
    "ageMin": null,
    "ageMax": null,
    "geography": "all"
  },
  "award": {
    "minAmount": 10000,
    "maxAmount": 20000,
    "currency": "INR",
    "disbursementMode": "direct_bank"
  },
  "documents": ["aadhaar", "income_certificate", "marksheet", "bank_passbook", "bonafide"],
  "conflictsWith": [],
  "deadline": { "typicalMonth": 10, "typicalDay": 31 },
  "portal": "https://scholarships.gov.in",
  "rubric": "Merit and means — evaluators weight income proof heavily",
  "successPatterns": "Applications with income certificate from current FY approved at 87% rate",
  "scamRisk": false,
  "instituteApprovalRequired": true,
  "quotaByState": { "KA": 12000, "MH": 18000 }
}
```

Minimum scholarship entries required:
- `central.json` — NSP (Central Sector), PMSS (PM Scholarship Scheme), PMRF, Post-Matric SC/ST
- `state.json` — 8–10 state-level schemes (diverse states, diverse categories)
- `csr.json` — 5–6 well-known corporate CSR scholarship schemes

**RuleEngine.ts:**
- Pure deterministic eligibility checks — no Gemini calls
- Checks: income cap, marks threshold, category match, geography, age, course level, document availability
- Returns for each scheme: `{ eligible: boolean, score: number, reasons: string[], requiresGeminiEvaluation: boolean }`
- `requiresGeminiEvaluation: true` only when eligibility is genuinely ambiguous (edge cases, compound criteria)
- Must cover 10 distinct profile test cases with Jest unit tests

**ConflictDetector.ts:**
- Maintains a conflict matrix — which scholarships cannot be combined
- `detectConflicts(schemeIds: string[]): ConflictResult[]`
- Returns which pairs conflict and why (usually: same ministry, same award type, stated mutual exclusion)

**StackOptimizer.ts:**
- Input: `MatchedScholarship[]` from DiscoveryAgent
- Runs combinatorial optimization — finds maximum value non-conflicting subset
- Returns ranked stack with total potential award value and recommended application order
- Must handle up to 20 matched scholarships without performance issues

**SuccessProbability.ts:**
- Input: `UserProfile` + `schemeId`
- Returns a probability score (0–100) with confidence level
- Based on synthetic historical data seeded in Firestore `/knowledge_graph`
- Factors: category approval rate, income bracket, state, marks range, document completeness

**QuotaTracker.ts:**
- Tracks available seats per scholarship by category and state
- Returns urgency level: `high` (< 10% remaining), `medium`, `low`
- Data seeded in Firestore, updated when new applications are tracked

**ScamDetector.ts:**
- Verifies scholarship against known official portal list
- Flags: registration fee required, non-government email contact, no official portal URL
- Returns: `{ isLegitimate: boolean, riskFlags: string[], verificationSource: string }`

**InstituteVerifier.ts:**
- Checks whether a given college (by AISHE code or name) is on the approved list for a scholarship
- Returns: `{ approved: boolean, scheme: string, reason?: string }`

**BankValidator.ts:**
- Validates IFSC code format and existence
- Checks name on account against Aadhaar name (fuzzy match)
- Flags inactive account indicators
- Returns: `{ valid: boolean, issues: string[] }`

**RAG Pipeline:**

`SchemeIndexer.ts`:
- Reads all scholarship JSON files + scheme PDFs (if available)
- Chunks text at 512 tokens with 50-token overlap
- Embeds each chunk using Gemini text-embedding-004
- Indexes into Qdrant collections: `scheme_metadata`, `scheme_rubrics`, `success_patterns`
- Run at startup if collections are empty

`Retriever.ts`:
- `retrieveRelevantContext(query: string, collection: string, topK: number): Promise<ChunkResult[]>`
- Embeds query → cosine similarity search in Qdrant → returns top-K chunks
- Used by DiscoveryAgent and DraftingAgent

`QdrantClient.ts`:
- Qdrant HTTP client wrapper
- `upsertVectors()`, `searchVectors()`, `createCollection()`, `healthCheck()`

**Demo Seed Data:**

`priya-sharma.json` — complete journey:
```json
{
  "userId": "demo-priya-001",
  "profile": {
    "name": "Priya Sharma",
    "dob": "2004-08-15",
    "category": "sc",
    "income": 180000,
    "state": "MH",
    "course": "B.Sc Computer Science",
    "institute": "Government College of Arts and Science",
    "marks": 84,
    "aisheCode": "C-12345"
  },
  "applicationState": "SUBMITTED",
  "matchedSchemes": ["nsp-central-2024", "pmss-2024"],
  "documentHealth": 91,
  "draftedApplicationUrl": "https://storage.googleapis.com/...",
  "stateHistory": [
    { "state": "PENDING", "timestamp": "2024-10-01T09:00:00Z" },
    { "state": "PROFILED", "timestamp": "2024-10-01T09:01:12Z" },
    { "state": "DISCOVERED", "timestamp": "2024-10-01T09:01:45Z" },
    { "state": "DOCS_PENDING", "timestamp": "2024-10-01T09:02:00Z" },
    { "state": "VALIDATING", "timestamp": "2024-10-01T09:05:33Z" },
    { "state": "DRAFTING", "timestamp": "2024-10-01T09:06:10Z" },
    { "state": "SUBMITTED", "timestamp": "2024-10-01T09:07:55Z" }
  ]
}
```

`seed.ts` — script to write all seed data to Firestore on command: `npm run seed`

### Exported Contract (what Person 2 calls)

```typescript
export async function getEligibleScholarships(profile: UserProfile): Promise<MatchedScholarship[]>
export async function validateEligibility(profile: UserProfile, scheme: Scholarship): Promise<EligibilityResult>
export async function getScholarshipStack(matches: MatchedScholarship[]): Promise<ScholarshipStack>
export async function getSuccessProbability(profile: UserProfile, schemeId: string): Promise<ProbabilityResult>
export async function detectConflicts(schemeIds: string[]): Promise<ConflictResult[]>
export async function verifyInstitute(instituteName: string, aisheCode: string, schemeId: string): Promise<InstituteVerificationResult>
export async function validateBankDetails(ifsc: string, accountName: string, aadhaarName: string): Promise<BankValidationResult>
export async function detectScam(scholarshipUrl: string, scholarshipName: string): Promise<ScamDetectionResult>
```

**Person 3 never touches:** Agent logic, Express routes, BullMQ, Docker, frontend.

**Person 3's only dependency:** `schemas/index.ts` from Person 1.

---

## 7. Person 4 — Frontend

### Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| HTTP Client | Axios |
| Auth | Firebase Auth SDK |
| Real-time | Firestore SDK (for live state updates) |
| Voice Input | Web Speech API (browser-native) |
| PDF | jsPDF |
| Offline | Service Workers |
| PWA | Web App Manifest |
| i18n | Custom TranslationContext |
| Storage | localStorage (save + resume) |
| Hosting | Firebase Hosting |

### Folder Ownership

```
frontend/src/
├── pages/
│   ├── Landing.tsx
│   ├── Profile.tsx
│   ├── Scholarships.tsx
│   ├── Documents.tsx
│   ├── Draft.tsx
│   ├── Track.tsx
│   ├── Family.tsx
│   ├── Rejection.tsx
│   └── Admin.tsx
├── components/
│   ├── AgentPipeline.tsx
│   ├── ValidationProgress.tsx
│   ├── ScholarshipCard.tsx
│   ├── StackOptimizer.tsx
│   ├── HealthDashboard.tsx
│   ├── ConsentModal.tsx
│   ├── VoiceInput.tsx
│   ├── OfflineBanner.tsx
│   ├── LanguageSelector.tsx
│   └── StatusTimeline.tsx
├── context/
│   ├── TranslationContext.tsx
│   └── AuthContext.tsx
├── hooks/
│   ├── useVoiceInput.ts
│   ├── useSaveResume.ts
│   ├── useOfflineMode.ts
│   └── useJobPoller.ts
├── lib/
│   ├── api.ts
│   └── firebase.ts
├── types/
│   └── index.ts               # Mirror of backend schemas/index.ts
└── public/
    ├── manifest.json
    └── sw.js
```

### What Person 4 Builds — Complete Checklist

**Auth + Config:**
- `lib/firebase.ts` — Firebase Auth initialization
- `lib/api.ts` — Axios instance with base URL from env, auth token injection interceptor, standard error handler
- `context/AuthContext.tsx` — Firebase Auth state, login/logout, token refresh
- `types/index.ts` — copy from `backend/src/schemas/index.ts` at Hour 0, keep in sync

**i18n Layer:**
- `context/TranslationContext.tsx` — language state, `t('key')` function, Google Translate API proxy calls, sessionStorage cache, RTL direction detection for Urdu/Arabic
- Supported languages at launch: English, Hindi, Kannada, Telugu, Tamil
- All UI text routed through `t()` — no hardcoded English strings in components

**Hooks:**
- `useVoiceInput.ts` — Web Speech API mic, returns transcript as string, handles browser support check
- `useSaveResume.ts` — auto-saves form state to localStorage every 30 seconds, restores on page load
- `useOfflineMode.ts` — detects offline state via navigator + service worker, returns `{ isOffline, isCached }`
- `useJobPoller.ts` — polls `GET /api/jobs/:jobId/status` every 2 seconds until job completes or fails, returns `{ status, result, error }`

**Pages — build in this priority order:**

1. `Landing.tsx` — hero section, language selector, "Start Your Journey" CTA, DPDP consent trigger
2. `Profile.tsx` — multi-step form (5 steps), voice input button on each field, save-resume, progress indicator
3. `Scholarships.tsx` — scheme match cards with score badge + eligibility reason chips + stack optimizer panel
4. `Documents.tsx` — file upload slots per required document, 7-layer validation progress, health score ring, actionable error messages
5. `Draft.tsx` — drafted application viewer, field-by-field explanation, PDF download button
6. `Track.tsx` — status timeline with agent step visualization, WhatsApp notification history
7. `Rejection.tsx` — rejection reason display, corrected application viewer, grievance filing confirmation
8. `Family.tsx` — household member cards with individual match results + combined opportunity total
9. `Admin.tsx` — agent pipeline health, application stats by state, queue depth, dead letter queue

**Components:**

- `AgentPipeline.tsx` — animated visualization of agents firing in sequence, each lights up as its job runs (polls `useJobPoller`)
- `ValidationProgress.tsx` — 7-layer progress bar, each layer shows pass/fail/pending with message
- `ScholarshipCard.tsx` — scheme name, award amount, deadline urgency badge, eligibility score, reason chips (3 reasons visible, expandable), "Apply" button
- `StackOptimizer.tsx` — visual of combined scholarship stack, total value, application order recommendation
- `HealthDashboard.tsx` — per-agent green/yellow/red status, queue depth number, error rate, last 10 failed jobs
- `ConsentModal.tsx` — DPDP consent modal shown before any data is processed, cannot be dismissed without explicit accept
- `VoiceInput.tsx` — mic button, recording indicator, displays transcript in real-time
- `OfflineBanner.tsx` — banner shown when offline, indicates cached data is being used
- `LanguageSelector.tsx` — dropdown with 5 language options and native script labels
- `StatusTimeline.tsx` — vertical timeline with state names, timestamps, and agent action descriptions

**PWA:**
- `manifest.json` — app name, icons, theme color, start URL, display mode standalone
- `sw.js` — caches static assets + scholarship list + last known profile state, serves cached pages offline

**Accessibility:**
- ARIA labels on all inputs and interactive elements
- Keyboard navigation support on all pages
- Focus trap in modals
- Screen reader announcements on agent state changes (aria-live regions)

**Person 4 never touches:** Backend code, agent logic, Firestore config, Docker, queue setup.

**Person 4's only dependency:** Cloud Run URL from Person 1 (available by Hour 3 with stub responses).

---

## 8. Shared Contracts — schemas/index.ts

Person 1 writes this at Hour 0. Everyone imports from it. No exceptions.

```typescript
// User & Profile
export interface UserProfile {
  userId: string;
  name: string;
  dob: string;                    // ISO 8601
  category: 'general' | 'sc' | 'st' | 'obc' | 'minority';
  income: number;                 // Annual household income in INR
  state: string;                  // ISO 3166-2 state code
  course: string;
  institute: string;
  aisheCode?: string;
  marks: number;                  // Percentage
  documentsAvailable: DocumentType[];
  language: SupportedLanguage;
  createdAt: string;
  updatedAt: string;
}

export type DocumentType = 'aadhaar' | 'income_certificate' | 'caste_certificate' |
  'marksheet' | 'bank_passbook' | 'bonafide' | 'selfie' | 'fee_receipt';

export type SupportedLanguage = 'en' | 'hi' | 'kn' | 'te' | 'ta';

// Scholarships
export interface Scholarship {
  id: string;
  name: string;
  category: 'central' | 'state' | 'minority' | 'csr' | 'merit';
  eligibility: EligibilityCriteria;
  award: AwardDetails;
  documents: DocumentType[];
  conflictsWith: string[];
  portal: string;
  deadline: DeadlineInfo;
  scamRisk: boolean;
  instituteApprovalRequired: boolean;
}

export interface EligibilityCriteria {
  minMarks?: number;
  maxIncome?: number;
  categories: string[];
  geography: string | 'all';
  minClass?: number;
  maxClass?: string;
  ageMin?: number;
  ageMax?: number;
}

export interface AwardDetails {
  minAmount: number;
  maxAmount: number;
  currency: 'INR';
  disbursementMode: string;
}

export interface DeadlineInfo {
  typicalMonth: number;
  typicalDay: number;
  confirmed?: boolean;
  exactDate?: string;
}

export interface MatchedScholarship extends Scholarship {
  score: number;                  // 0–100
  reasons: string[];
  successProbability: number;     // 0–100
  requiresGeminiEvaluation: boolean;
  urgency: 'high' | 'medium' | 'low';
}

export interface ScholarshipStack {
  schemes: MatchedScholarship[];
  totalValue: number;
  applicationOrder: string[];
  conflicts: ConflictResult[];
}

// Agent Inputs + Outputs
export interface ProfileAgentInput {
  userId: string;
  rawFormData: Record<string, unknown>;
}
export interface ProfileAgentOutput {
  profile: UserProfile;
  validationFlags: string[];
  confidence: number;
}

export interface DiscoveryAgentInput {
  userId: string;
  profile: UserProfile;
}
export interface DiscoveryAgentOutput {
  matches: MatchedScholarship[];
  stack: ScholarshipStack;
  totalOpportunityValue: number;
}

export interface DocAgentInput {
  userId: string;
  documents: { type: DocumentType; url: string; }[];
  schemeIds: string[];
}
export interface DocAgentOutput {
  perDocumentResults: DocumentValidationResult[];
  healthScore: number;
  issues: ValidationIssue[];
  readyForSubmission: boolean;
}

export interface DocumentValidationResult {
  documentType: DocumentType;
  layers: LayerResult[];
  overallPassed: boolean;
}

export interface LayerResult {
  layer: string;
  passed: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationIssue {
  documentType: DocumentType;
  issue: string;
  fix: string;
  blocking: boolean;
}

export interface DraftingAgentInput {
  userId: string;
  profile: UserProfile;
  scheme: MatchedScholarship;
  validatedDocuments: DocAgentOutput;
}
export interface DraftingAgentOutput {
  applicationText: string;
  coverLetter: string;
  pdfUrl: string;
  fieldExplanations: Record<string, string>;
  translatedSummary: string;
}

export interface TrackingAgentInput {
  applicationId: string;
  userId: string;
}
export interface TrackingAgentOutput {
  applicationId: string;
  currentState: ApplicationState;
  stateHistory: StateTransition[];
  nextExpectedAction: string;
  estimatedDays?: number;
}

export interface RejectionAgentInput {
  applicationId: string;
  userId: string;
  rejectionLetterUrl?: string;
  rejectionLetterText?: string;
}
export interface RejectionAgentOutput {
  rejectionReason: string;
  plainLanguageExplanation: string;
  fixedApplicationText: string;
  grievanceId?: string;
  legalNoticeDraft?: string;
  reapplicationEligible: boolean;
}

export interface FamilyAgentInput {
  userId: string;
  householdMembers: HouseholdMember[];
}
export interface FamilyAgentOutput {
  memberResults: { member: HouseholdMember; matches: MatchedScholarship[]; }[];
  householdOpportunityValue: number;
}

export interface HouseholdMember {
  name: string;
  relation: string;
  age: number;
  course?: string;
  income?: number;
  category: string;
}

// Application State
export type ApplicationState =
  'PENDING' | 'PROFILED' | 'DISCOVERED' | 'DOCS_PENDING' |
  'VALIDATING' | 'DRAFTING' | 'REVIEW' | 'SUBMITTED' |
  'TRACKING' | 'RECEIVED' | 'REJECTED' | 'GRIEVANCE_FILED' |
  'RESOLVED' | 'RENEWAL_DUE';

export interface StateTransition {
  from: ApplicationState;
  to: ApplicationState;
  timestamp: string;
  agentName: string;
  note?: string;
}

// Supporting
export interface EligibilityResult {
  eligible: boolean;
  score: number;
  reasons: string[];
  requiresGeminiEvaluation: boolean;
}

export interface ConflictResult {
  schemeA: string;
  schemeB: string;
  reason: string;
}

export interface ProbabilityResult {
  probability: number;
  confidence: 'high' | 'medium' | 'low';
  basedOn: string;
}

export interface InstituteVerificationResult {
  approved: boolean;
  scheme: string;
  reason?: string;
}

export interface BankValidationResult {
  valid: boolean;
  issues: string[];
}

export interface ScamDetectionResult {
  isLegitimate: boolean;
  riskFlags: string[];
  verificationSource: string;
}

export interface AuditEntry {
  agentName: string;
  userId: string;
  action: string;
  input: unknown;
  output: unknown;
  timestamp: string;
  durationMs: number;
}

// API Standard Shapes
export interface ApiSuccess<T> {
  success: true;
  data: T;
  requestId: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    requestId: string;
    retryAfter?: number;
  };
}
```

---

## 9. API Contract

All endpoints follow the standard `ApiSuccess<T> | ApiError` response shape.

| Method | Endpoint | Auth | Body Schema | Response |
|---|---|---|---|---|
| POST | `/api/profile/submit` | Required | `ProfileAgentInput` | `ApiSuccess<{ jobId: string }>` |
| POST | `/api/eligibility/check` | Required | `DiscoveryAgentInput` | `ApiSuccess<{ jobId: string }>` |
| POST | `/api/eligibility/stack` | Required | `{ matches: MatchedScholarship[] }` | `ApiSuccess<ScholarshipStack>` |
| POST | `/api/documents/validate` | Required | `DocAgentInput` | `ApiSuccess<{ jobId: string }>` |
| GET | `/api/documents/checklist/:schemeId` | Required | — | `ApiSuccess<DocumentType[]>` |
| POST | `/api/draft/application` | Required | `DraftingAgentInput` | `ApiSuccess<{ jobId: string }>` |
| GET | `/api/draft/:applicationId` | Required | — | `ApiSuccess<DraftingAgentOutput>` |
| GET | `/api/track/:applicationId` | Required | — | `ApiSuccess<TrackingAgentOutput>` |
| POST | `/api/track/confirm-receipt` | Required | `{ applicationId: string }` | `ApiSuccess<StateTransition>` |
| POST | `/api/rejection/analyze` | Required | `RejectionAgentInput` | `ApiSuccess<{ jobId: string }>` |
| POST | `/api/family/map` | Required | `FamilyAgentInput` | `ApiSuccess<{ jobId: string }>` |
| GET | `/api/jobs/:jobId/status` | Required | — | `ApiSuccess<{ status: string; result?: unknown }>` |
| GET | `/api/health` | None | — | System health JSON |
| GET | `/api/admin/stats` | Admin | — | Aggregate statistics |
| GET | `/api/admin/applications` | Admin | — | All applications |

**Async pattern:** Heavy jobs (profile, eligibility, documents, draft, rejection) return a `jobId` immediately (HTTP 202). Frontend polls `GET /api/jobs/:jobId/status` until `status === 'completed'` or `status === 'failed'`.

---

## 10. Integration Protocol

### Hour 0 — Contract Lock (30 minutes, mandatory)

1. Person 1 writes `schemas/index.ts` and commits
2. Person 2 confirms agent I/O shapes are covered
3. Person 3 confirms data layer output shapes are covered
4. Person 4 copies to `frontend/src/types/index.ts`
5. `docker-compose.yml` and `.env.example` committed by Person 1
6. All team members run `docker-compose up` successfully — zero exceptions

No code is written before this step is complete.

### Hour 3 — Stub Endpoints Live

- Person 1 deploys stub endpoints to Cloud Run (hardcoded valid responses matching `schemas/index.ts`)
- Person 4 immediately points `lib/api.ts` at Cloud Run URL
- From this point, frontend development is completely unblocked

### Hour 10 — Data → Agent Integration

- Person 3's intelligence exports imported into Person 2's agents
- Specifically: `RuleEngine.ts` → `DiscoveryAgent.ts`, `StackOptimizer.ts` → `DiscoveryAgent.ts`
- One pairing session (30 minutes), resolve any type mismatches against `schemas/index.ts`

### Hour 14 — Full Integration Sync

30-minute walkthrough with all four:
1. Person 4 shares screen — full profile → discover → validate → draft → track flow
2. Person 1 confirms Cloud Run logs show no 500 errors
3. Document every broken interaction — assign to exactly one person
4. Hard rule: all broken flows must be resolved by Hour 17

### Hour 17 — Integration Hard Deadline

All broken flows resolved. No new features after this point.

### Hour 18 — Demo Prep

- Person 3 runs `npm run seed` against production Firestore
- Priya Sharma demo journey seeded and verified
- Person 1 confirms health endpoint green on production URL

### Hour 20 — Final Deployment

- Person 1 deploys final Cloud Run build
- Person 4 deploys to Firebase Hosting
- All four verify their screens against production URL

---

## 11. Security Implementation

### Middleware Stack (applied in this exact order)

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://storage.googleapis.com"],
      connectSrc: ["'self'", "https://firebaseapp.com", "https://identitytoolkit.googleapis.com"],
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  frameguard: { action: 'deny' },
}));
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimiter);
app.use(authenticate);
app.use(validateRequest);
// Routes
app.use(errorHandler);
```

### Rate Limits per Endpoint

| Endpoint | Limit |
|---|---|
| POST /api/profile/submit | 20 requests / minute / IP |
| POST /api/eligibility/check | 10 requests / minute / user |
| POST /api/documents/validate | 5 requests / minute / user |
| POST /api/draft/application | 3 requests / minute / user |
| POST /api/rejection/analyze | 2 requests / minute / user |
| GET /api/health | 60 requests / minute / IP (no auth) |
| All admin endpoints | 30 requests / minute / user + admin role check |

### Document Security

- Signed Cloud Storage URLs with 1-hour expiry — no permanent public URLs
- File type whitelist on upload: `application/pdf`, `image/jpeg`, `image/png` only
- Max file size: 5MB per document
- Virus scanning: Cloud Storage built-in malware detection enabled

### PII Masking in Logs

```typescript
function maskPII(data: unknown): unknown {
  // Aadhaar: XXXX-XXXX-1234 (last 4 visible)
  // Phone: +91-XXXXXX-7890 (last 4 visible)
  // Bank account: XXXXXXXX1234 (last 4 visible)
  // Email: u***@domain.com
}
```

Applied in `piiMasker.middleware.ts` before any logging call.

### Firestore Security Rules

Users access only their own documents:
```
match /users/{userId} { allow read, write: if request.auth.uid == userId; }
match /applications/{appId} { allow read, write: if request.auth.uid == resource.data.userId; }
match /dead_letter/{docId} { allow read, write: if request.auth.token.admin == true; }
```

### DPDP Compliance

- `ConsentModal.tsx` on frontend — shown before any data is collected, cannot be dismissed without explicit "I Agree"
- Consent timestamp written to Firestore `/users/{userId}/consent`
- No data processing triggered until consent document exists

---

## 12. Error Handling and Failure Strategy

### Agent-Level (Person 2 implements in BaseAgent)

```typescript
async execute(input: TInput): Promise<TOutput> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await this.run(input);
      await this.logAction(this.constructor.name, input, result);
      return result;
    } catch (error) {
      lastError = error as Error;
      const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  await this.writeAuditTrail({
    agentName: this.constructor.name,
    action: 'EXECUTION_FAILED',
    input,
    output: { error: lastError?.message },
    timestamp: new Date().toISOString(),
    durationMs: 0,
    userId: (input as any).userId ?? 'unknown',
  });
  return this.fallbackResponse(input);
}
```

Every agent provides a `fallbackResponse()` — never throws to the caller.

### Gemini-Specific Failures

| Failure | Response |
|---|---|
| Rate limit (429) | Exponential backoff, 3 retries |
| API unavailable (503) | Return cached eligibility results from Firestore for DiscoveryAgent |
| Response not valid JSON | Zod validation fails, trigger retry with explicit JSON instruction in prompt |
| Response schema mismatch | Log as critical, return fallback, alert via dead letter queue |

### Infrastructure Failures

| Failure | Mitigation |
|---|---|
| Firestore unavailable | Redis cache serves last known state |
| Redis unavailable | BullMQ falls back to in-memory queue (no persistence, acceptable for hackathon) |
| Cloud Run cold start | `minScale: 1` set in `cloudbuild.yaml` |
| WhatsApp delivery failed | Fallback to SMS via Exotel |
| Qdrant unavailable | DiscoveryAgent falls back to RuleEngine-only matching (no RAG context) |

### API Error Response Shape (always consistent)

```typescript
{
  success: false,
  error: {
    code: 'AGENT_TIMEOUT',          // Machine-readable, never expose internal names
    message: 'Service temporarily unavailable. Please try again.',
    requestId: 'uuid-v4',
    retryAfter: 30                  // Seconds, included when applicable
  }
}
```

Stack traces, internal error messages, and Firestore paths are never exposed in production responses.

### BullMQ Dead Letter Queue

- Jobs that fail all 3 retries → written to `/dead_letter` Firestore collection
- Auto-retry after 5 minutes (1 attempt)
- Alert logged (console.error in production until monitoring is added)

---

## 13. Timeline and Milestones

| Hour | Milestone | Owner |
|---|---|---|
| 0 | `schemas/index.ts` written, committed, pulled by all | P1 |
| 0 | `docker-compose.yml` working for all team members | P1 |
| 0 | All 4 members on same branch, local dev running | All |
| 1 | Person 3 begins scholarship JSON data entry | P3 |
| 1 | Person 2 begins BaseAgent + Gemini service wrapper | P2 |
| 2 | Person 4 scaffolds React app + Axios client | P4 |
| 3 | All stub endpoints deployed to Cloud Run | P1 |
| 3 | Person 4 points frontend at Cloud Run URL | P4 |
| 5 | RuleEngine.ts complete with 10 test cases passing | P3 |
| 6 | ProfileAgent + DiscoveryAgent complete (unit tested) | P2 |
| 8 | Scholarship database complete (20+ schemes) | P3 |
| 8 | DocIntelligenceAgent + all 7 validation layers complete | P2 |
| 10 | Person 3 data exports integrated into Person 2's agents | P2 + P3 |
| 10 | DraftingAgent complete with RAG | P2 |
| 12 | Landing, Profile, Scholarships pages complete | P4 |
| 12 | RAG pipeline indexed and retrieval tested | P3 |
| 14 | Full integration sync — all 4 walk the Priya journey | All |
| 14 | Documents, Draft, Track pages complete | P4 |
| 15 | RejectionAgent + FamilyMapperAgent complete | P2 |
| 16 | Admin, Rejection, Family pages complete | P4 |
| 17 | All integration blockers resolved — HARD DEADLINE | All |
| 17 | TrackingAgent + StatusMachine complete | P2 |
| 18 | Seed data loaded to production Firestore | P3 |
| 18 | Priya Sharma demo journey verified end-to-end | P1 |
| 19 | PWA, i18n, accessibility complete | P4 |
| 20 | Final production deployment | P1 |
| 20 | Demo rehearsal — full 3-minute walkthrough | All |
| 21 | Pitch deck finalized | All |
| 22 | Buffer for critical fixes | All |
| 24 | Submit | All |

---

## 14. Demo Seed Data

**Primary demo persona:** Priya Sharma

```
Name:       Priya Sharma
Age:        20
Category:   SC
Income:     ₹1,80,000/year
State:      Maharashtra
Course:     B.Sc Computer Science, Year 2
Institute:  Government College of Arts and Science
Marks:      84%
Status:     SUBMITTED
```

Matched schemes: NSP Central Sector + Post-Matric SC Scholarship  
Document health score: 91/100  
Drafted application: pre-generated PDF in Cloud Storage  
State history: Full 7-state transition visible in timeline  
WhatsApp notifications: 4 messages in history  

**Demo flow (3 minutes):**

1. Landing page → Select language (Kannada) → DPDP consent
2. Onboarding form → Voice input for name → auto-save visible
3. Scheme match cards → Two matches with scores and eligibility reasons → Stack optimizer shows ₹38,000 combined
4. Document upload → 7-layer validation progress fires → Health score 91 → One warning flagged (document approaching expiry)
5. Draft viewer → Complete application text → PDF download
6. Track page → Full state timeline → WhatsApp notification history → Agent pipeline visualization
7. Admin dashboard → Live queue health → Priya's application in table

**Wow moment:** Document validation progress bar fires all 7 layers live with pass/fail indicators. Judges who know ML will recognize what Gemini Vision is doing. Students watch AI validate their documents in real time.

---

## 15. Environment Variables

Person 1 owns `.env.example`. All keys documented below.

```env
# Server
NODE_ENV=production
PORT=8080

# Firebase
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_STORAGE_BUCKET=

# Gemini
GEMINI_API_KEY=

# Redis
REDIS_URL=

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

# Google Translate
GOOGLE_TRANSLATE_API_KEY=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=

# Exotel
EXOTEL_API_KEY=
EXOTEL_API_TOKEN=
EXOTEL_SUBDOMAIN=

# Frontend (Vite)
VITE_API_BASE_URL=https://nayanta-backend-xxx.run.app
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Sensitive keys stored in Google Secret Manager. Never committed to repo. `.env.example` has all keys with empty values only.

---

## 16. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Gemini API rate limit during demo | Medium | Critical | Pre-cache all demo responses in Firestore by Hour 18 |
| Cloud Run cold start kills demo timing | Low | High | `minScale: 1` in cloudbuild.yaml — always one warm instance |
| Integration mismatch at Hour 14 | Medium | High | `schemas/index.ts` at Hour 0 eliminates 90% of type mismatches |
| Qdrant self-hosted goes down | Low | Medium | DiscoveryAgent falls back to RuleEngine-only — eligibility still works, no RAG context |
| DigiLocker sandbox API restrictions | High | Low | Mock service built — real flow shown in architecture diagram |
| CPGRAMS API complexity | High | Low | Mock service built — grievance ID is realistic, judges told real API is stubbed |
| Document validation too slow for demo | Medium | High | Pre-run validation on Priya's documents, cache results — replay for judges |
| BullMQ/Redis unavailable | Low | High | In-memory fallback queue — stateless but functional for demo duration |
| Frontend incomplete by Hour 17 | Medium | High | Priority order enforced — critical path pages (Profile, Scholarships, Documents, Draft, Track) built first |
| Scope creep after Hour 10 | High | Medium | Feature list frozen after Hour 10. No additions without team consensus and Person 1 approval |
| Wrong IFSC or Firebase config in production | Medium | High | `.env.example` reviewed by Person 1 before final deployment |
| Demo live flow breaks during judging | Medium | Critical | Priya Sharma seed data is pre-completed — can show pre-seeded state as fallback |

---

*Nayanta AI — Helping students navigate broken systems.*  
*Built with Google ADK + Gemini 1.5 Flash. Deployed on Google Cloud Run.*  
*This document is the single source of truth for all architectural and implementation decisions.*