# Nayanta AI

![Status](https://img.shields.io/badge/status-active-success)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?logo=express&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-FFCA28?logo=firebase&logoColor=black)
![Google Cloud Run](https://img.shields.io/badge/Deploy-Cloud%20Run-4285F4?logo=googlecloud&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-1.5%20Flash-4285F4?logo=google&logoColor=white)
![Qdrant](https://img.shields.io/badge/Qdrant-Vector%20Store-EF4444)

Nayanta AI is an end-to-end AI-powered scholarship navigation platform built for underprivileged Indian students. It does not just list scholarships; it helps students discover, validate, draft, track, and recover scholarship applications in their own language.[file:1][file:2]

## The Problem

India has thousands of scholarships across central, state, minority, and CSR channels, yet a large share goes unclaimed because discovery is fragmented, forms are complex, language access is poor, and documentation errors lead to rejection.[file:1]

Students often rely on word-of-mouth, disconnected portals, and manual paperwork, while many give up after rejection because there is no clear grievance or recovery path.[file:1]

## The Idea

Nayanta AI acts as a personal scholarship navigator. It builds a student profile, matches them to eligible schemes, validates documents before submission, drafts applications, tracks progress, and helps recover rejected cases through guided grievance support.[file:1][file:2]

## Key Features

- Intelligent profile building with multilingual and voice-first onboarding.[file:1]
- Scholarship discovery across central, state, category-based, and CSR schemes.[file:1]
- Stack optimization to identify the best non-conflicting scholarship combination.[file:1]
- 7-layer document intelligence to catch issues before submission.[file:1]
- AI-assisted application drafting and PDF generation.[file:1][file:2]
- Real-time tracking, rejection analysis, and grievance support.[file:1]

## Unique Value

Most platforms stop at scholarship listing or discovery. Nayanta AI is designed to support the full journey from zero awareness to successful funding, without expecting the student to understand government systems, eligibility complexity, or bureaucratic workflows.[file:1][file:2]

## How It Works

1. Student submits profile details using a multilingual, voice-friendly interface.[file:1]
2. The system builds a structured student profile.[file:1]
3. Eligible scholarships are discovered and ranked.[file:1]
4. The best non-conflicting scholarship stack is selected.[file:1]
5. Documents are validated through multiple intelligence layers.[file:1]
6. Applications are drafted and prepared for submission.[file:1]
7. Submission status, disbursement, and rejection recovery are tracked.[file:1][file:2]

## Tech Stack

| Layer | Stack |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS, Web Speech API, PWA support [file:2] |
| Backend | Node.js, TypeScript, Express.js, Zod, BullMQ [file:1][file:2] |
| AI Layer | Google ADK, Gemini 1.5 Flash, Gemini Vision, text-embedding-004, LangGraph [file:1][file:2] |
| Data and Infra | Firestore, Redis, Qdrant, Google Cloud Storage, Firebase Auth [file:1][file:2] |
| Deployment | Docker, Google Cloud Run, GitHub Actions, Firebase Hosting [file:2] |
| Integrations | DigiLocker, CPGRAMS, PFMS, Twilio, Exotel [file:1][file:2] |

## Security and Trust

The project plan emphasizes consent-first processing, masking of sensitive PII in logs, signed document URLs, Firestore access rules, request validation, rate limiting, and audit trails for agent actions.[file:1][file:2]

## Target Users

Nayanta AI is designed primarily for first-generation college students, rural students, low-income families, and students from reserved or underserved categories who face the highest friction in scholarship access.[file:1]

It can also support counselors, NGOs, and education departments that want better scholarship utilization and tracking.[file:1]

## Impact Vision

The platform is built around a simple goal: no eligible student should lose financial aid because the system was too complex to navigate. The long-term value is not just better discovery, but measurable improvement in scholarship access, reduced rejection, and lower dropout pressure caused by financial barriers.[file:1]
