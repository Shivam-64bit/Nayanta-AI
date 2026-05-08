/**
 * agents/ProfileAgent.ts
 *
 * Normalizes raw form input (from voice, form, or WhatsApp) into a
 * structured UserProfile using Gemini Flash.
 * Writes the validated profile to Firestore /users/{userId}.
 */

import { BaseAgent } from './BaseAgent';
import { getGeminiService } from '../services/gemini.service';
import { getFirestore } from '../config/firestore.config';
import { COLLECTIONS } from '../config/constants';
import {
  UserProfileSchema,
  type ProfileAgentInput,
  type ProfileAgentOutput,
  type UserProfile,
} from '../schemas';
import { z } from 'zod';

// Zod schema for the intermediate Gemini response
const GeminiProfileResponseSchema = z.object({
  name: z.string(),
  dob: z.string(),
  category: z.string(),
  income: z.number(),
  state: z.string(),
  district: z.string().optional(),
  course: z.string(),
  courseLevel: z.string().optional(),
  institute: z.string(),
  marks: z.number(),
  phone: z.string().optional(),
  isDisabled: z.boolean().optional(),
  disabilityPercentage: z.number().optional(),
  isBplCardHolder: z.boolean().optional(),
  confidenceScore: z.number().min(0).max(100),
  missingFields: z.array(z.string()),
});

class ProfileAgent extends BaseAgent<ProfileAgentInput, ProfileAgentOutput> {
  protected readonly agentName = 'ProfileAgent';

  async run(input: ProfileAgentInput): Promise<ProfileAgentOutput> {
    const gemini = getGeminiService();

    // Step 1: Ask Gemini to normalize the raw input into structured fields
    const prompt = [
      `You are a data extraction assistant for an Indian government scholarship platform.`,
      `The user submitted the following raw input (source: ${input.inputSource}, language: ${input.language}):`,
      ``,
      `"""`,
      input.rawInput,
      `"""`,
      ``,
      `Extract and normalize the following fields into valid values:`,
      `- name: full name (cleaned, properly capitalized)`,
      `- dob: date of birth in YYYY-MM-DD format`,
      `- category: one of [general, obc, sc, st, ews, pwd]`,
      `- income: annual family income as a number in INR`,
      `- state: 2-letter Indian state code (e.g. MH, UP, KA)`,
      `- district: district name if mentioned`,
      `- course: course name`,
      `- courseLevel: one of [pre_matric, post_matric, graduation, post_graduation, phd]`,
      `- institute: institution name`,
      `- marks: percentage marks (0–100)`,
      `- phone: phone in +91XXXXXXXXXX format if available`,
      `- isDisabled: boolean`,
      `- disabilityPercentage: 0–100 if applicable`,
      `- isBplCardHolder: boolean`,
      `- confidenceScore: your confidence (0–100) in the extracted data`,
      `- missingFields: array of field names that could not be extracted`,
      ``,
      `Return ONLY valid JSON.`,
    ].join('\n');

    const extracted = await gemini.generateStructured(prompt, GeminiProfileResponseSchema);

    // Step 2: Build the full UserProfile
    const now = new Date().toISOString();
    const profileData: UserProfile = {
      userId: input.userId,
      name: extracted.name,
      dob: extracted.dob,
      category: this.normalizeCategory(extracted.category),
      income: extracted.income,
      state: extracted.state.toUpperCase().slice(0, 2),
      district: extracted.district,
      course: extracted.course,
      courseLevel: this.normalizeCourseLevel(extracted.courseLevel),
      institute: extracted.institute,
      marks: Math.min(100, Math.max(0, extracted.marks)),
      documentsAvailable: [],
      language: input.language,
      phone: extracted.phone,
      isDisabled: extracted.isDisabled ?? false,
      disabilityPercentage: extracted.disabilityPercentage,
      isBplCardHolder: extracted.isBplCardHolder ?? false,
      createdAt: now,
      updatedAt: now,
    };

    // Step 3: Validate against the canonical schema
    const validated = UserProfileSchema.parse(profileData);

    // Step 4: Persist to Firestore
    const db = getFirestore();
    await db.collection(COLLECTIONS.USERS).doc(input.userId).set(validated, { merge: true });

    return {
      profile: validated,
      confidenceScore: extracted.confidenceScore,
      missingFields: extracted.missingFields,
    };
  }

  fallbackResponse(input: ProfileAgentInput): ProfileAgentOutput {
    const now = new Date().toISOString();
    return {
      profile: {
        userId: input.userId,
        name: '',
        dob: '2000-01-01',
        category: 'general',
        income: 0,
        state: 'XX',
        course: '',
        institute: '',
        marks: 0,
        documentsAvailable: [],
        language: input.language,
        isDisabled: false,
        isBplCardHolder: false,
        createdAt: now,
        updatedAt: now,
      },
      confidenceScore: 0,
      missingFields: ['name', 'dob', 'category', 'income', 'state', 'course', 'institute', 'marks'],
    };
  }

  // -----------------------------------------------------------------------
  // Normalizers
  // -----------------------------------------------------------------------

  private normalizeCategory(raw?: string): 'general' | 'obc' | 'sc' | 'st' | 'ews' | 'pwd' {
    if (!raw) return 'general';
    const lower = raw.toLowerCase().trim();
    const mapping: Record<string, 'general' | 'obc' | 'sc' | 'st' | 'ews' | 'pwd'> = {
      general: 'general', gen: 'general', ur: 'general',
      obc: 'obc', 'other backward': 'obc',
      sc: 'sc', 'scheduled caste': 'sc',
      st: 'st', 'scheduled tribe': 'st',
      ews: 'ews', 'economically weaker': 'ews',
      pwd: 'pwd', disabled: 'pwd', divyang: 'pwd',
    };
    for (const [key, value] of Object.entries(mapping)) {
      if (lower.includes(key)) return value;
    }
    return 'general';
  }

  private normalizeCourseLevel(raw?: string) {
    if (!raw) return undefined;
    const lower = raw.toLowerCase().trim();
    const mapping: Record<string, string> = {
      'pre_matric': 'pre_matric', 'pre matric': 'pre_matric', 'below 10': 'pre_matric',
      'post_matric': 'post_matric', 'post matric': 'post_matric', '11': 'post_matric', '12': 'post_matric',
      'graduation': 'graduation', 'ug': 'graduation', 'bachelor': 'graduation', 'btech': 'graduation',
      'post_graduation': 'post_graduation', 'pg': 'post_graduation', 'master': 'post_graduation', 'mtech': 'post_graduation',
      'phd': 'phd', 'doctorate': 'phd',
    };
    for (const [key, value] of Object.entries(mapping)) {
      if (lower.includes(key)) return value as any;
    }
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Exported runner (contract with Person 1 queue processors)
// ---------------------------------------------------------------------------

const agent = new ProfileAgent();

export async function runProfileAgent(input: ProfileAgentInput): Promise<ProfileAgentOutput> {
  return agent.execute(input);
}
