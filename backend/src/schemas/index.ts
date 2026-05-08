/**
 * schemas/index.ts
 *
 * IMMUTABLE — Single Source of Truth for all type contracts across the project.
 * All agents, routes, and processors import types from here.
 * Do NOT modify without coordinating with all team members.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

export const ApplicationStateEnum = z.enum([
  'PENDING',
  'PROFILED',
  'DISCOVERED',
  'DOCS_PENDING',
  'VALIDATING',
  'DRAFTING',
  'REVIEW',
  'SUBMITTED',
  'TRACKING',
  'RECEIVED',
  'REJECTED',
  'GRIEVANCE_FILED',
  'RESOLVED',
  'RENEWAL_DUE',
]);
export type ApplicationState = z.infer<typeof ApplicationStateEnum>;

export const CategoryEnum = z.enum(['general', 'obc', 'sc', 'st', 'ews', 'pwd']);
export type Category = z.infer<typeof CategoryEnum>;

export const CourseLevelEnum = z.enum(['pre_matric', 'post_matric', 'graduation', 'post_graduation', 'phd']);
export type CourseLevel = z.infer<typeof CourseLevelEnum>;

export const DocumentTypeEnum = z.enum([
  'aadhaar',
  'income_certificate',
  'marksheet',
  'bank_passbook',
  'bonafide',
  'caste_certificate',
  'disability_certificate',
  'domicile_certificate',
  'fee_receipt',
  'photograph',
  'selfie',
]);
export type DocumentType = z.infer<typeof DocumentTypeEnum>;

export const LanguageEnum = z.enum(['hi', 'en', 'bn', 'te', 'mr', 'ta', 'gu', 'kn', 'ml', 'pa', 'or']);
export type Language = z.infer<typeof LanguageEnum>;

// ---------------------------------------------------------------------------
// User Profile
// ---------------------------------------------------------------------------

export const UserProfileSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).max(100),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  category: CategoryEnum,
  income: z.number().int().nonnegative().max(10_000_000),
  state: z.string().length(2, 'Use 2-letter state code, e.g. MH, UP'),
  district: z.string().optional(),
  course: z.string().min(1).max(200),
  courseLevel: CourseLevelEnum.optional(),
  institute: z.string().min(1).max(200),
  aisheCode: z.string().optional(),
  marks: z.number().min(0).max(100),
  documentsAvailable: z.array(DocumentTypeEnum),
  language: LanguageEnum.default('hi'),
  phone: z.string().regex(/^\+91\d{10}$/, 'Phone must be in +91XXXXXXXXXX format').optional(),
  bankAccountNumber: z.string().optional(),
  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/).optional(),
  isDisabled: z.boolean().default(false),
  disabilityPercentage: z.number().min(0).max(100).optional(),
  isBplCardHolder: z.boolean().default(false),
  validationFlags: z.record(z.string(), z.boolean()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

// ---------------------------------------------------------------------------
// Scholarship Scheme
// ---------------------------------------------------------------------------

export const ScholarshipSchemeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  authority: z.string().min(1),
  type: z.enum(['central', 'state', 'csr', 'institutional']),
  description: z.string(),
  annualAmount: z.number().nonnegative(),
  eligibility: z.object({
    categories: z.array(CategoryEnum),
    maxIncome: z.number().nonnegative(),
    minMarks: z.number().min(0).max(100),
    courseLevels: z.array(CourseLevelEnum),
    states: z.array(z.string()).optional(),
    minAge: z.number().optional(),
    maxAge: z.number().optional(),
    requiredDocuments: z.array(DocumentTypeEnum),
    conflictsWith: z.array(z.string()),
  }),
  deadline: z.string().datetime().optional(),
  portalUrl: z.string().url(),
  isActive: z.boolean().default(true),
});
export type ScholarshipScheme = z.infer<typeof ScholarshipSchemeSchema>;

// ---------------------------------------------------------------------------
// Matched Scholarship (Discovery Agent output)
// ---------------------------------------------------------------------------

export const MatchedScholarshipSchema = z.object({
  schemeId: z.string(),
  schemeName: z.string(),
  annualAmount: z.number(),
  matchScore: z.number().min(0).max(100),
  eligibilityReasons: z.array(z.string()),
  ineligibilityReasons: z.array(z.string()),
  successProbability: z.number().min(0).max(100),
  quotaUrgency: z.enum(['high', 'medium', 'low']),
  requiresGeminiEvaluation: z.boolean(),
});
export type MatchedScholarship = z.infer<typeof MatchedScholarshipSchema>;

// ---------------------------------------------------------------------------
// Document Validation
// ---------------------------------------------------------------------------

export const LayerResultSchema = z.object({
  layer: z.number().int().min(1).max(7),
  name: z.string(),
  passed: z.boolean(),
  issues: z.array(z.string()),
  confidence: z.number().min(0).max(100),
});
export type LayerResult = z.infer<typeof LayerResultSchema>;

export const DocumentValidationResultSchema = z.object({
  applicationId: z.string(),
  healthScore: z.number().min(0).max(100),
  layerResults: z.array(LayerResultSchema),
  actionableIssues: z.array(z.string()),
  missingDocuments: z.array(DocumentTypeEnum),
  isReady: z.boolean(),
});
export type DocumentValidationResult = z.infer<typeof DocumentValidationResultSchema>;

// ---------------------------------------------------------------------------
// Application
// ---------------------------------------------------------------------------

export const StateTransitionSchema = z.object({
  from: ApplicationStateEnum,
  to: ApplicationStateEnum,
  timestamp: z.string().datetime(),
  agentName: z.string(),
  note: z.string().optional(),
});
export type StateTransition = z.infer<typeof StateTransitionSchema>;

export const ApplicationSchema = z.object({
  applicationId: z.string(),
  userId: z.string(),
  schemeId: z.string(),
  state: ApplicationStateEnum,
  draftedApplicationUrl: z.string().url().optional(),
  submissionReference: z.string().optional(),
  grievanceId: z.string().optional(),
  disbursementConfirmed: z.boolean().default(false),
  rejectionReason: z.string().optional(),
  stateHistory: z.array(StateTransitionSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Application = z.infer<typeof ApplicationSchema>;

// ---------------------------------------------------------------------------
// Agent Input/Output Shapes (contract with Person 2)
// ---------------------------------------------------------------------------

export const ProfileAgentInputSchema = z.object({
  userId: z.string(),
  rawInput: z.string(),
  inputSource: z.enum(['voice', 'form', 'whatsapp']),
  language: LanguageEnum,
});
export type ProfileAgentInput = z.infer<typeof ProfileAgentInputSchema>;

export const ProfileAgentOutputSchema = z.object({
  profile: UserProfileSchema,
  confidenceScore: z.number().min(0).max(100),
  missingFields: z.array(z.string()),
});
export type ProfileAgentOutput = z.infer<typeof ProfileAgentOutputSchema>;

export const DiscoveryAgentInputSchema = z.object({
  userId: z.string(),
  profile: UserProfileSchema,
});
export type DiscoveryAgentInput = z.infer<typeof DiscoveryAgentInputSchema>;

export const DiscoveryAgentOutputSchema = z.object({
  matches: z.array(MatchedScholarshipSchema),
  totalPotentialValue: z.number(),
  recommendedStack: z.array(z.string()),
});
export type DiscoveryAgentOutput = z.infer<typeof DiscoveryAgentOutputSchema>;

export const DocAgentInputSchema = z.object({
  userId: z.string(),
  applicationId: z.string(),
  documentUrls: z.record(DocumentTypeEnum, z.string().url()),
  schemeIds: z.array(z.string()),
});
export type DocAgentInput = z.infer<typeof DocAgentInputSchema>;

export const DocAgentOutputSchema = DocumentValidationResultSchema;
export type DocAgentOutput = z.infer<typeof DocAgentOutputSchema>;

export const DraftingAgentInputSchema = z.object({
  userId: z.string(),
  applicationId: z.string(),
  profile: UserProfileSchema,
  schemeId: z.string(),
  documentUrls: z.record(DocumentTypeEnum, z.string().url()),
});
export type DraftingAgentInput = z.infer<typeof DraftingAgentInputSchema>;

export const DraftingAgentOutputSchema = z.object({
  applicationId: z.string(),
  pdfUrl: z.string().url(),
  filledFields: z.record(z.string(), z.string()),
  warningFields: z.array(z.string()),
});
export type DraftingAgentOutput = z.infer<typeof DraftingAgentOutputSchema>;

export const TrackingAgentInputSchema = z.object({
  userId: z.string(),
  applicationId: z.string(),
  submissionReference: z.string(),
  schemeId: z.string(),
});
export type TrackingAgentInput = z.infer<typeof TrackingAgentInputSchema>;

export const TrackingAgentOutputSchema = z.object({
  applicationId: z.string(),
  currentState: ApplicationStateEnum,
  nspStatus: z.string().optional(),
  pfmsStatus: z.string().optional(),
  nextCheckAt: z.string().datetime().optional(),
});
export type TrackingAgentOutput = z.infer<typeof TrackingAgentOutputSchema>;

export const RejectionAgentInputSchema = z.object({
  userId: z.string(),
  applicationId: z.string(),
  rejectionLetterUrl: z.string().url().optional(),
  rejectionReason: z.string(),
});
export type RejectionAgentInput = z.infer<typeof RejectionAgentInputSchema>;

export const RejectionAgentOutputSchema = z.object({
  applicationId: z.string(),
  plainLanguageExplanation: z.string(),
  grievanceId: z.string().optional(),
  reapplyRecommended: z.boolean(),
  fixedFields: z.array(z.string()),
});
export type RejectionAgentOutput = z.infer<typeof RejectionAgentOutputSchema>;

export const FamilyAgentInputSchema = z.object({
  primaryUserId: z.string(),
  members: z.array(UserProfileSchema),
});
export type FamilyAgentInput = z.infer<typeof FamilyAgentInputSchema>;

export const FamilyAgentOutputSchema = z.object({
  perMemberMatches: z.record(z.string(), z.array(MatchedScholarshipSchema)),
  householdTotalPotentialValue: z.number(),
  applicationOrder: z.array(z.string()),
});
export type FamilyAgentOutput = z.infer<typeof FamilyAgentOutputSchema>;

// ---------------------------------------------------------------------------
// API Response Shapes (contract with Person 4 — Frontend)
// ---------------------------------------------------------------------------

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
    field?: string;
  };
  requestId: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ---------------------------------------------------------------------------
// Queue Job Shapes
// ---------------------------------------------------------------------------

export const JobStatusEnum = z.enum(['waiting', 'active', 'completed', 'failed', 'delayed']);
export type JobStatus = z.infer<typeof JobStatusEnum>;

export interface QueueJobResult {
  jobId: string;
  queue: string;
  status: JobStatus;
  progress: number;
  result?: unknown;
  failReason?: string;
  createdAt: number;
  processedAt?: number;
  finishedAt?: number;
}

// ---------------------------------------------------------------------------
// Health Check Shape
// ---------------------------------------------------------------------------

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    firestore: 'up' | 'down';
    redis: 'up' | 'down';
    qdrant: 'up' | 'down';
  };
  queues: Record<string, { waiting: number; active: number; failed: number }>;
  version: string;
}

// ---------------------------------------------------------------------------
// Request Validation Schemas (used by validate.middleware.ts)
// ---------------------------------------------------------------------------

export const SubmitProfileRequestSchema = z.object({
  userId: z.string().min(1),
  rawInput: z.string().min(1),
  inputSource: z.enum(['voice', 'form', 'whatsapp']),
  language: LanguageEnum,
});

export const CheckEligibilityRequestSchema = z.object({
  userId: z.string().min(1),
});

export const OptimizeStackRequestSchema = z.object({
  userId: z.string().min(1),
  schemeIds: z.array(z.string()).min(1).max(30),
});

export const ValidateDocumentsRequestSchema = z.object({
  userId: z.string().min(1),
  applicationId: z.string().min(1),
  documentUrls: z.record(z.string(), z.string().url()),
  schemeIds: z.array(z.string()).min(1),
});

export const DraftApplicationRequestSchema = z.object({
  userId: z.string().min(1),
  schemeId: z.string().min(1),
  applicationId: z.string().min(1),
});

export const ConfirmReceiptRequestSchema = z.object({
  applicationId: z.string().min(1),
  confirmedAt: z.string().datetime(),
});

export const AnalyzeRejectionRequestSchema = z.object({
  userId: z.string().min(1),
  applicationId: z.string().min(1),
  rejectionReason: z.string().min(1),
  rejectionLetterUrl: z.string().url().optional(),
});

export const MapFamilyRequestSchema = z.object({
  primaryUserId: z.string().min(1),
  members: z.array(UserProfileSchema).min(1).max(10),
});
