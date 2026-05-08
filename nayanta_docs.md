# Nayanta AI
### *Helping students navigate broken systems.*

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [The Problem](#the-problem)
3. [Our Solution](#our-solution)
4. [Existing Services & How Nayanta Sits On Top](#existing-services)
5. [Features](#features)
6. [USP — Unique Selling Proposition](#usp)
7. [X / Wow Factor](#wow-factor)
8. [System Architecture & Workflow](#architecture)
9. [Agent Breakdown](#agent-breakdown)
10. [Tech Stack](#tech-stack)
11. [Security & Compliance](#security)
12. [Target Users](#target-users)
13. [Impact Metrics](#impact-metrics)

---

## 1. Executive Summary

**Nayanta AI** is an end-to-end AI-powered scholarship navigation platform built for underprivileged Indian students. India has thousands of scholarships — central, state, corporate, and NGO-funded — yet the majority go unclaimed every year. Not because students don't qualify. Because the system is too broken, too fragmented, and too inaccessible for the students who need it most.

Nayanta doesn't just list scholarships. It acts as a personal AI navigator — understanding each student's profile, matching them to every scheme they're eligible for, validating their documents with 7-layer intelligence, drafting applications in their language, filing grievances when things go wrong, and tracking outcomes — all autonomously.

**The mission:** No eligible student should lose a scholarship because they didn't know it existed, couldn't fill the form, or gave up navigating the bureaucracy.

---

## 2. The Problem

### 2.1 Scale of the Crisis
- India has **5,000+ scholarship schemes** across central, state, and CSR tiers.
- Over **₹3,500 crore** worth of scholarships go **unclaimed every year**.
- Less than **12% of eligible students** successfully apply for schemes they qualify for.
- Over **40% of applications** are rejected due to **documentation errors**, not ineligibility.

### 2.2 Broken Discovery
Students rely on word-of-mouth, notice boards, and Google searches. Most never hear about schemes beyond NSP (National Scholarship Portal). State-specific, minority-specific, OBC, SC/ST, merit-based, and corporate CSR scholarships are practically invisible to the average student.

### 2.3 Language & Literacy Barriers
Government portals operate in English. A first-generation college student from rural Karnataka whose mother tongue is Kannada is immediately excluded. No translation. No guidance. No support.

### 2.4 Documentation Hell
Students are asked to produce income certificates, caste certificates, Aadhaar, bank passbooks, bonafide letters, and more — each with different validity windows, issuing authority requirements, and format specifications per scheme. One mismatch = rejection. No explanation given.

### 2.5 The Stacking Problem
Students don't know they can legally combine multiple non-conflicting scholarships. A student eligible for NSP + Karnataka Rajyotsava + a Wipro CSR grant is leaving ₹1.8L on the table by applying to only one.

### 2.6 Post-Application Abandonment
Portals don't explain rejections. There's no grievance tracking, no re-application guidance, no human support. Students give up. Permanently.

### 2.7 Physical Bottlenecks
Students in rural areas need to physically visit government offices to get documents attested, applications submitted, or errors corrected — losing wages, travel money, and academic time.

---

## 3. Our Solution

Nayanta AI addresses every problem above with a corresponding AI-powered layer:

| Problem | Nayanta's Solution |
|---|---|
| Broken discovery | DiscoveryAgent — matches 5,000+ schemes to individual profile in real-time |
| Language barriers | 22-language support layer across entire platform + voice input |
| Documentation errors | DocIntelligenceAgent — 7-layer document validation before submission |
| Stacking ignorance | StackOptimizer — maximizes non-conflicting scholarship combinations |
| Post-rejection abandonment | RejectionAgent — explains rejections, files CPGRAMS grievances automatically |
| Physical bottlenecks | DigiLocker integration + nearest CSC locator with appointment scheduling |
| First-time complexity | DraftingAgent — auto-fills and generates complete applications with explanations |

Nayanta doesn't make students navigate the system. **Nayanta navigates it for them.**

---

## 4. Existing Services & How Nayanta Sits On Top

Nayanta doesn't reinvent infrastructure — it orchestrates existing government and commercial services through intelligent AI agents.

### Government Infrastructure
| Service | What It Does | How Nayanta Uses It |
|---|---|---|
| **NSP (National Scholarship Portal)** | Central scholarship registry | DiscoveryAgent queries + auto-fills applications |
| **DigiLocker** | Digital document repository | Pulls verified documents directly — no manual upload |
| **CPGRAMS** | Government grievance portal | RejectionAgent auto-files grievances with structured evidence |
| **PFMS** | Payment tracking system | TrackingAgent monitors disbursement status |
| **Aadhaar / eKYC** | Identity verification | ProfileAgent verifies identity at onboarding |

### Commercial & API Infrastructure
| Service | Role in Nayanta |
|---|---|
| **Gemini 1.5 Flash** | Core reasoning across all agents |
| **Gemini Vision** | Document OCR + face match + QR validation |
| **text-embedding-004** | RAG retrieval for scheme matching |
| **Twilio WhatsApp** | Proactive status updates + deadline reminders |
| **Exotel** | Voice call scheduling with CSC officers |
| **Qdrant** | Vector store for scheme knowledge base |
| **Firebase Auth** | Secure student authentication |
| **Google Cloud Storage** | Encrypted document storage with signed URLs |

### The Layer Nayanta Adds
Every existing service above operates in silos. A student would need to:
- Manually check NSP + 28 state portals
- Download DigiLocker documents themselves
- Know CPGRAMS exists to file a grievance
- Understand PFMS to track payment

**Nayanta is the intelligent orchestration layer that connects all of these — with zero manual effort from the student.**

---

## 5. Features

### 5.1 Intelligent Profile Builder
- Multi-step onboarding form with voice input (Web Speech API)
- 22-language support — student fills form in their language
- Auto-save with resume capability — never lose progress
- Family mapper for household income + sibling education context
- Smart field suggestions based on partial inputs

### 5.2 Scholarship Discovery Engine
- Matches against 5,000+ schemes: central, state, minority, OBC/SC/ST, merit, corporate CSR
- Real-time eligibility scoring with reasons displayed per scheme
- Filters by deadline urgency, approval probability, award amount
- Scam detector — flags fraudulent or expired schemes
- Institute verifier — confirms college is approved for each scheme

### 5.3 Stack Optimizer
- Identifies maximum non-conflicting scholarship combinations
- Calculates total potential award value per stack
- Flags mutual exclusion rules between schemes
- Displays optimized stack with application priority order

### 5.4 Document Intelligence (7-Layer Validation)
- **Layer 1:** Cross-document consistency (name, DOB, address match)
- **Layer 2:** Freshness validation (document expiry per scheme requirements)
- **Layer 3:** Issuing authority verification (right office, right format)
- **Layer 4:** Face match (Aadhaar photo vs selfie via Gemini Vision)
- **Layer 5:** Digital signature validation
- **Layer 6:** Address consistency across all documents
- **Layer 7:** QR/barcode verification
- Live progress UI showing each validation layer
- Clear, actionable error messages — not rejection codes

### 5.5 Application Drafting Agent
- Auto-fills application forms using validated profile + documents
- Generates complete application PDF in required format
- Explains every field filled — student understands what was submitted
- Supports downloading, printing, and direct portal submission

### 5.6 Real-Time Tracking
- Unified dashboard across all submitted applications
- Step-by-step agent pipeline visualization
- Deadline reminder engine via WhatsApp
- PFMS disbursement tracking

### 5.7 Rejection Intelligence & Grievance Filing
- Natural language explanation of every rejection
- Automatic CPGRAMS grievance filing with structured evidence
- Re-application guidance with corrected documents
- Escalation path if grievance is not resolved

### 5.8 CSC Locator & Appointment Booking
- Nearest Common Service Centre by district
- Exotel-powered call scheduling with CSC officers
- Guidance on which documents to carry

### 5.9 Admin / Health Dashboard
- Live agent pipeline health monitor
- Application success/failure analytics
- Quota tracking per scheme
- System alerts and dead-letter queue visibility

---

## 6. USP — Unique Selling Proposition

> **Nayanta is the only platform that takes a student from zero awareness to funded — entirely autonomously, in their own language, with zero bureaucratic knowledge required.**

Three pillars that no competitor matches simultaneously:

### 1. End-to-End Autonomy
Other platforms stop at discovery or listing. Nayanta goes from profile → match → validate → draft → submit → track → appeal. One platform. Zero handoffs to the student mid-journey.

### 2. Document Intelligence Before Submission
No other platform validates documents against 7 scheme-specific criteria before the student submits. Nayanta prevents rejection — it doesn't just report it.

### 3. Stack Optimization
No platform tells students they can combine scholarships. Nayanta actively maximizes the student's total scholarship income — not just the first match.

---

## 7. X / Wow Factor

### "It just handled everything."
A first-generation college student in Bidar, Karnataka — speaking only Kannada, with no knowledge of NSP, CPGRAMS, or DigiLocker — opens Nayanta on a ₹8,000 Android phone.

She answers voice questions in Kannada. Nayanta builds her profile.

It finds 11 schemes she qualifies for. Picks the best non-conflicting stack of 4. Pulls her documents from DigiLocker. Validates all 7 layers. Finds one document expired — tells her exactly what to get and from which office. She uploads the new one. Nayanta drafts all 4 applications. She taps "Submit."

Three weeks later, WhatsApp tells her ₹72,000 has been approved.

She never visited a government portal. She never read an English form. She never knew CPGRAMS existed.

**That's the wow factor. The system worked for her — for the first time in her life.**

---

### Technical Wow
- **7-layer document validation** running in parallel via Gemini Vision — before any portal ever sees the documents
- **Live agent pipeline visualization** — students watch AI agents fire in real-time, building trust through transparency
- **22-language voice-first interface** — accessibility as a first-class feature, not an afterthought
- **Scholarship stack optimizer** — combinatorial logic that no human caseworker has time to run
- **Zero training required** — pure inference on Google's pre-trained models via ADK + Gemini stack

---

## 8. System Architecture & Workflow

```
Student Input (Voice / Form / Document Upload)
         │
         ▼
┌─────────────────────────────────┐
│        Firebase Auth            │  Identity + Session
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│      Express API (Cloud Run)    │  Middleware: Helmet, CORS,
│      Rate Limiting + Zod        │  Auth, Validation, Error Handler
└─────────────────────────────────┘
         │
         ├──────────────────────────────────────┐
         ▼                                      ▼
┌──────────────────┐                  ┌──────────────────────┐
│   BullMQ Queues  │                  │   Firestore + Redis   │
│ (Job Processing) │                  │  (State + Cache)      │
└──────────────────┘                  └──────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│              Agent Orchestrator (ADK)               │
│                                                     │
│  ProfileAgent → DiscoveryAgent → DocAgent           │
│       → DraftingAgent → TrackingAgent               │
│       → RejectionAgent → FamilyMapperAgent          │
└─────────────────────────────────────────────────────┘
         │
         ├─────────────────────────┐
         ▼                         ▼
┌──────────────────┐     ┌──────────────────────────┐
│  Gemini 1.5 Flash│     │  Rule Engine + RAG        │
│  Gemini Vision   │     │  (Qdrant + Embeddings)    │
│  (Google AI API) │     │  Scholarship Intelligence │
└──────────────────┘     └──────────────────────────┘
         │
         ├──── DigiLocker (Document Pull)
         ├──── CPGRAMS (Grievance Filing)
         ├──── NSP / State Portals (Submission)
         ├──── PFMS (Disbursement Tracking)
         ├──── Twilio WhatsApp (Notifications)
         └──── Exotel (CSC Call Scheduling)
```

### Student Journey Flow
```
1. ONBOARD     → Voice/form input in native language
2. PROFILE     → ProfileAgent builds structured profile
3. DISCOVER    → DiscoveryAgent matches 5,000+ schemes
4. OPTIMIZE    → StackOptimizer picks best non-conflicting combination
5. VALIDATE    → DocIntelligenceAgent runs 7-layer check
6. DRAFT       → DraftingAgent generates complete applications
7. SUBMIT      → Direct portal submission or PDF download
8. TRACK       → TrackingAgent monitors status + PFMS
9. RESOLVE     → RejectionAgent explains + files CPGRAMS grievance
10. FUNDED     → WhatsApp confirmation + next cycle reminder
```

---

## 9. Agent Breakdown

| Agent | Responsibility | AI Model Used |
|---|---|---|
| **ProfileAgent** | Builds structured student profile from voice/form input | Gemini 1.5 Flash |
| **DiscoveryAgent** | Matches profile against 5,000+ schemes with scoring | Gemini + RAG (Qdrant) |
| **DocIntelligenceAgent** | 7-layer document validation + DigiLocker pull | Gemini Vision |
| **DraftingAgent** | Auto-fills and generates application PDFs | Gemini 1.5 Flash |
| **TrackingAgent** | Monitors portal status + PFMS disbursement | Rule Engine |
| **RejectionAgent** | Explains rejections + auto-files CPGRAMS | Gemini 1.5 Flash |
| **FamilyMapperAgent** | Maps household context for income-based schemes | Gemini 1.5 Flash |

---

## 10. Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework | Express.js |
| Deployment | Google Cloud Run |
| Queue | BullMQ + Redis |
| Database | Firestore |
| Storage | Google Cloud Storage |
| Secrets | Google Secret Manager |
| Auth | Firebase Authentication |

### AI / ML
| Component | Technology |
|---|---|
| Core LLM | Gemini 1.5 Flash (via Google ADK) |
| Vision | Gemini Vision API |
| Embeddings | text-embedding-004 |
| Vector Store | Qdrant |
| Orchestration | Google ADK + LangGraph |

### Frontend
| Layer | Technology |
|---|---|
| Framework | React (TypeScript) |
| Styling | Tailwind CSS |
| Voice Input | Web Speech API |
| Offline | Service Workers |
| i18n | 22-language context layer |

### External Integrations
| Service | Purpose |
|---|---|
| DigiLocker | Document retrieval |
| NSP + State Portals | Scholarship submission |
| CPGRAMS | Grievance filing |
| PFMS | Payment tracking |
| Twilio WhatsApp | Notifications |
| Exotel | Voice/call scheduling |

---

## 11. Security & Compliance

- **DPDP Act compliant** — explicit consent before any data processing
- **Zero PII in logs** — Aadhaar, phone, bank account numbers masked at middleware level
- **Signed URLs** — Cloud Storage documents expire after 1 hour
- **Firestore rules** — users access only their own data
- **Helmet.js** — full security header suite (HSTS, CSP, X-Frame-Options)
- **Rate limiting** — per-IP and per-user limits per endpoint
- **Zod validation** — every request validated before touching any agent
- **HMAC-SHA256** — signed webhook payloads
- **Audit trail** — every agent action logged, immutable

---

## 12. Target Users

### Primary
- First-generation college students from low-income families
- SC/ST/OBC students eligible for reserved category schemes
- Rural students with limited English literacy
- Students unaware of scheme stacking possibilities

### Secondary
- School students (Class 9–12) approaching college transition
- College counselors and NGO caseworkers using Nayanta on behalf of students
- State education departments monitoring scholarship utilization

### Geography (Phase 1)
- Karnataka (pilot — Kannada + English)
- Expansion to Hindi belt states in Phase 2
- Pan-India in Phase 3

---

## 13. Impact Metrics

### What We Measure
| Metric | Target (Year 1) |
|---|---|
| Students onboarded | 10,000 |
| Successful applications filed | 7,500 |
| Total scholarship value unlocked | ₹15 crore |
| Average stack value per student | ₹20,000 |
| Document rejection rate (pre-submission) | < 5% |
| Grievance resolution rate | > 60% |
| Languages supported at launch | 5 (Kannada, Hindi, Telugu, Tamil, English) |

### Social ROI
- Every ₹1 of platform cost → ₹40+ in scholarships unlocked (estimated)
- Reduction in student dropout due to financial pressure
- First measurable data layer on scholarship utilization at district level

---

*Nayanta AI — Helping students navigate broken systems.*
*Built with Google ADK + Gemini. Deployed on Google Cloud.*
