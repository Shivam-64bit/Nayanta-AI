# Nayanta AI

<p>
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black">
  <img alt="Express.js" src="https://img.shields.io/badge/Express.js-4.x-000000?logo=express&logoColor=white">
  <img alt="Firebase" src="https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-FFCA28?logo=firebase&logoColor=black">
  <img alt="Gemini AI" src="https://img.shields.io/badge/Gemini-1.5%20Flash-4285F4?logo=google&logoColor=white">
  <img alt="Cloud Run" src="https://img.shields.io/badge/Deploy-Cloud%20Run-4285F4?logo=googlecloud&logoColor=white">
  <img alt="Docker" src="https://img.shields.io/badge/Docker-Enabled-2496ED?logo=docker&logoColor=white">
</p>

Nayanta AI is an end-to-end AI-powered scholarship navigation platform built for underprivileged Indian students. Instead of only listing scholarship opportunities, it helps students move through the entire journey: discovery, eligibility understanding, document validation, application drafting, tracking, and rejection recovery. 

The core belief behind the project is simple: many students do not lose scholarships because they are ineligible; they lose them because the system is fragmented, bureaucratic, English-heavy, and unforgiving. Nayanta AI is designed to become the intelligent layer that navigates that system on behalf of the student. 

## The Problem

India has thousands of scholarship schemes across central, state, minority, merit, and CSR channels, yet a large portion of this support remains unclaimed every year. The project documents describe a system where scholarships are not inaccessible because they do not exist, but because students struggle to discover them, understand them, and successfully complete the process. 

Several structural problems repeat across the journey:

- Discovery is fragmented across portals, notice boards, institutions, and word of mouth. 
- Language becomes a barrier because many official systems assume English literacy. 
- Documentation requirements are confusing, inconsistent, and highly rejection-prone. 
- Students often do not know that some scholarships can be legally stacked together. 
- Rejection usually ends the journey because portals provide little explanation or recovery support. 
- Physical dependency on offices, attestations, and in-person corrections adds cost and delay for already vulnerable students. 

In short, the student is expected to understand a system made of disconnected forms, rules, agencies, and deadlines. Nayanta AI is built on the opposite idea: the student should not need to understand the bureaucracy in order to access the support they deserve. 

## The Idea

Nayanta AI is positioned as a personal scholarship navigator, not a scholarship directory. The project does not aim to replace government systems such as NSP, DigiLocker, PFMS, or grievance portals; instead, it orchestrates them through an AI-driven workflow that makes these services usable in one connected experience. 

The system begins with the student’s profile and works outward. It understands who the student is, what scholarships they qualify for, which combinations maximize support, whether their documents are actually submission-ready, and what to do if something goes wrong after submission. 

This makes the product different from search-first platforms. Nayanta is not asking students to do the hard work after discovery; it is trying to carry them from zero awareness to funded status with minimal bureaucratic burden. 

## What the platform does

The feature set in the project documents forms a full scholarship workflow rather than a loose set of tools. 

### 1. Intelligent profile building

The platform starts with a multilingual, voice-friendly onboarding flow that helps structure student data such as background, income, category, state, education level, course, institution, and available documents. The frontend plan also includes save-and-resume capability, smart field suggestions, and support for household context through a family mapper flow. 

This matters because many students do not arrive with a clean, complete, and machine-readable profile. A major part of the platform’s value is converting messy real-world information into a structured eligibility-ready representation. 

### 2. Scholarship discovery engine

Once a structured profile exists, Nayanta matches the student against a large scholarship base spanning central, state, category-based, and CSR opportunities. The discovery layer combines deterministic rule checks with AI reasoning for borderline or nuanced cases, and it can also surface reasons, urgency, approval probability, and legitimacy signals for each match. 

The result is not just a list of “possible” schemes. It is a ranked set of opportunities with context that helps the student understand why a scholarship is relevant and how promising it may be. 

### 3. Stack optimization

A key idea in the docs is that students often miss value because they apply to only one visible scheme even when multiple non-conflicting scholarships could be combined. Nayanta includes a stack optimizer that detects conflict rules, ranks valid combinations, and recommends the best order of application based on total potential award value. 

This turns the platform from a matching engine into a financial opportunity optimizer. Instead of asking “Which one scholarship can this student get?”, the system asks “What is the best non-conflicting package this student can realistically unlock?” 

### 4. Document intelligence

Documentation is treated as a first-class failure point in the scholarship process, so Nayanta includes a 7-layer validation pipeline before submission. According to the docs, this includes cross-document consistency checks, freshness checks, issuing-authority checks, face match, digital signature validation, address consistency, and QR or barcode verification. 

This is one of the strongest parts of the concept because it shifts the platform from reactive help to preventive quality control. Instead of telling students why they were rejected after the fact, the system tries to catch those issues before the application reaches the portal. 

### 5. Application drafting

After matching and validation, Nayanta can draft application content using the validated student profile, scholarship-specific requirements, and supporting context from the intelligence layer. The project plan also describes PDF generation, field-by-field explanation, and translation-aware outputs so students understand what has been filled on their behalf. 

This helps reduce another common failure mode: students abandoning the process because forms are long, repetitive, unclear, or intimidating. Drafting is not only about speed; it is also about reducing cognitive load. 

### 6. Tracking and status visibility

The platform is designed to continue working after submission through a unified dashboard that shows application state, status history, reminders, and disbursement-related progress. The docs connect this layer with PFMS-style tracking, WhatsApp updates, and a visible agent pipeline so students can see progress rather than feeling lost after submission. 

That changes the emotional experience of the process. Many students are not just blocked by application complexity; they are discouraged by silence and uncertainty after submission. 

### 7. Rejection intelligence and grievance support

If a rejection happens, the project does not treat it as the end of the journey. A rejection analysis agent is described that can read rejection context, explain it in plain language, identify likely fix paths, regenerate corrected application material, and file a grievance through CPGRAMS-style flows with structured evidence. 

This is one of the clearest signs that Nayanta is designed as an end-to-end support system. It is trying to serve the student not only at the “discovery” stage but at the most discouraging stage, where most users would otherwise give up. 

## Why it is different

The documents repeatedly frame Nayanta’s unique value in three layers. 

- End-to-end autonomy: the platform spans profile creation, discovery, optimization, validation, drafting, tracking, and appeal instead of stopping at listing. 
- Document intelligence before submission: the platform tries to prevent rejection instead of merely reporting eligibility. 
- Stack optimization: the system focuses on maximizing the student’s total scholarship opportunity, not just recommending a single option. 

That combination gives the project a strong identity. Many tools can search; fewer can guide. Even fewer can optimize, validate, explain, and recover in one workflow. 

## Student journey

The high-level workflow described in the docs is straightforward and product-friendly. 

1. The student enters data through a voice-first, multilingual onboarding flow. 
2. A profile agent converts this into a structured student profile. 
3. A discovery layer matches the student against scholarship opportunities. 
4. A stack optimizer selects the best valid scholarship combination. 
5. A document agent runs multi-layer validation before submission. 
6. A drafting layer prepares application-ready outputs. 
7. The platform supports submission, PDF download, or portal handoff. 
8. A tracking layer monitors state and disbursement progress. 
9. A rejection layer explains failures and triggers grievance recovery if needed. 
10. The student is guided until funding or next-step resolution. 

This flow is important because the project is easiest to understand as a guided journey, not as a collection of isolated AI features. 

## Architecture overview

At the system level, Nayanta combines a frontend application, an API layer, asynchronous job processing, multiple specialized agents, external integrations, and a scholarship intelligence engine. 

A simplified architecture narrative looks like this:

- Frontend collects profile data, documents, and user actions through a multilingual React interface. 
- Express-based backend exposes authenticated API routes and standard response contracts. 
- Heavy operations are offloaded to BullMQ-backed queues for profile processing, eligibility, document validation, drafting, tracking, rejection analysis, and family mapping. 
- Agent orchestration is handled through Google ADK and LangGraph-style state transitions. 
- Firestore stores profile, application, and state data, while Redis supports job and cache workflows. 
- Qdrant stores vectorized scholarship knowledge for retrieval-augmented reasoning and drafting context. 
- External services such as DigiLocker, PFMS, CPGRAMS, Twilio, and Exotel extend the system beyond a standalone app. 

The project plan also stresses that the architecture is stateful and resilient. Each stage of the flow is represented in a state machine, and agent operations are designed with retries, fallback responses, and dead-letter handling for failed jobs. 

## Agent design

The platform is centered around specialized agents rather than one general-purpose assistant. 

| Agent | Role |
|---|---|
| ProfileAgent | Builds a structured student profile from raw form or voice input. |
| DiscoveryAgent | Matches the student profile against scholarships, scores them, and explains relevance. |
| DocIntelligenceAgent | Validates documents across seven layers before submission. |
| DraftingAgent | Generates application-ready content and PDFs from validated inputs. |
| TrackingAgent | Monitors application state changes, reminders, and disbursement progress. |
| RejectionAgent | Explains rejection causes and initiates grievance and recovery flows. |
| FamilyMapperAgent | Maps household-level opportunity across multiple eligible members. |

This decomposition makes the product easier to reason about both technically and from a user-trust perspective. Instead of a vague “AI does everything” pitch, the docs present a clear map of which intelligence layer handles which part of the journey. 

## Tech stack

The technical foundation described in the documents is modern, strongly typed, cloud-oriented, and agent-centric. 

| Layer | Technologies |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Web Speech API, PWA support, Firebase Hosting. |
| Backend | Node.js 20, TypeScript, Express.js, Zod, Helmet, express-rate-limit, BullMQ. |
| AI and orchestration | Google ADK, Gemini 1.5 Flash, Gemini Vision, text-embedding-004, LangGraph. |
| Data and storage | Firestore, Redis, Qdrant, Google Cloud Storage. |
| Auth and security | Firebase Authentication, Google Secret Manager, signed URLs, middleware-based PII masking. |
| Integrations | DigiLocker, NSP/state portals, PFMS, CPGRAMS, Twilio WhatsApp, Exotel. |
| Deployment | Docker, Google Cloud Run, GitHub Actions. |

One useful technical point in the plan is that the backend and frontend are tied together through shared schema contracts. The docs repeatedly emphasize a single source of truth for interfaces and API shapes so that routes, agents, and UI remain aligned during fast-moving development. 

## Security and trust

Because the platform handles highly sensitive student data, the docs place strong emphasis on privacy, validation, and controlled access. 

The security posture described includes:

- Explicit consent before data processing for DPDP-style compliance. 
- Firebase-authenticated access control and Firestore rules limiting users to their own records. 
- No raw sensitive PII in logs, with masking for Aadhaar, phone, bank, and email fields. 
- Signed Cloud Storage URLs with limited expiry for generated or uploaded documents. 
- Helmet-based security headers, CORS controls, request validation, and per-endpoint rate limits. 
- Immutable audit trails for agent actions and failure handling through retries and dead-letter storage. 

This is an important part of the product story. A scholarship platform for vulnerable students cannot rely only on clever AI; it also has to be trustworthy in how it handles identity, documents, and application history. 

## Who it is for

The primary users are first-generation college students, low-income families, students from reserved or underserved categories, and rural students with limited English literacy. The docs also mention secondary users such as school students transitioning to college, counselors, NGO caseworkers, and education departments monitoring scholarship utilization. 

That user framing is strong because it is specific. The product is not trying to be a generic education assistant; it is designed around students who face the highest friction in access to financial support. 

## Impact vision

The impact section in the docs is not limited to product adoption metrics. It connects the platform to larger social outcomes such as reducing scholarship leakage, lowering documentation-related rejection, improving grievance resolution, and reducing dropout pressure caused by unmet financial need. 

The project’s stated targets include onboarding students at scale, increasing successful applications, improving document readiness before submission, and unlocking significant scholarship value that would otherwise remain unused. It also frames the system as a way to create measurable visibility into scholarship utilization patterns that are currently opaque. 

That gives Nayanta a larger purpose than automation. The platform is trying to convert fragmented entitlement into actual access. 

## Why this project matters

Nayanta AI matters because it treats scholarship access as a systems problem, not a search problem. The docs consistently show that the hardest part is not merely finding a scheme; it is surviving the chain of eligibility interpretation, paperwork, language barriers, submission friction, silence, and rejection. 

By designing around that full chain, Nayanta becomes more than a student utility. It becomes an orchestration layer for a broken public-facing process, with AI used not as a gimmick but as a way to remove invisible friction from a high-stakes journey.
