/**
 * services/gemini.service.ts
 *
 * Wraps the Gemini 1.5 Flash API for structured text generation.
 * - Always requests JSON output via responseMimeType for structured calls
 * - Validates every response against the caller-provided Zod schema
 * - Retries transient failures (429, 5xx, timeouts) with exponential backoff
 * - Singleton pattern — one SDK instance per process
 */

import {
  GoogleGenerativeAI,
  type GenerativeModel,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';
import { z } from 'zod';
import { GEMINI } from '../config/constants';

// ---------------------------------------------------------------------------
// Public Interfaces
// ---------------------------------------------------------------------------

export interface StructuredGenerationOptions {
  /** System instruction prepended to the prompt */
  systemInstruction?: string;
  /** Override default temperature (0–2) */
  temperature?: number;
  /** Override default max output tokens */
  maxOutputTokens?: number;
}

// ---------------------------------------------------------------------------
// Safety settings — shared across all calls
// ---------------------------------------------------------------------------

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class GeminiService {
  private readonly client: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set.');
    }
    this.client = new GoogleGenerativeAI(apiKey);
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Generates structured JSON output validated against a Zod schema.
   * The prompt should describe the desired JSON shape explicitly.
   */
  async generateStructured<T>(
    prompt: string,
    schema: z.ZodType<T>,
    options?: StructuredGenerationOptions,
  ): Promise<T> {
    return this.withRetry(async () => {
      const model = this.buildModel(options, true);
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error(`Gemini returned non-JSON response: ${text.slice(0, 200)}`);
      }

      const validated = schema.safeParse(parsed);
      if (!validated.success) {
        throw new Error(
          `Gemini response failed schema validation: ${validated.error.issues.map(i => i.message).join('; ')}`,
        );
      }
      return validated.data;
    });
  }

  /**
   * Generates plain text output (no JSON enforcement).
   */
  async generateText(
    prompt: string,
    options?: StructuredGenerationOptions,
  ): Promise<string> {
    return this.withRetry(async () => {
      const model = this.buildModel(options, false);
      const result = await model.generateContent(prompt);
      return result.response.text();
    });
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  private buildModel(options?: StructuredGenerationOptions, json = false): GenerativeModel {
    return this.client.getGenerativeModel({
      model: GEMINI.TEXT_MODEL,
      generationConfig: {
        temperature: options?.temperature ?? GEMINI.TEMPERATURE,
        maxOutputTokens: options?.maxOutputTokens ?? GEMINI.MAX_OUTPUT_TOKENS,
        ...(json ? { responseMimeType: 'application/json' } : {}),
      },
      safetySettings: SAFETY_SETTINGS,
      ...(options?.systemInstruction ? { systemInstruction: options.systemInstruction } : {}),
    });
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= GEMINI.MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (!isRetryable(lastError) || attempt === GEMINI.MAX_RETRIES) {
          break;
        }

        const delay = GEMINI.RETRY_BASE_MS * Math.pow(2, attempt - 1);
        console.warn(
          `[GeminiService] Attempt ${attempt}/${GEMINI.MAX_RETRIES} failed: ${lastError.message}. Retrying in ${delay}ms…`,
        );
        await sleep(delay);
      }
    }

    throw lastError ?? new Error('Gemini generation failed after all retries.');
  }
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

function isRetryable(error: Error): boolean {
  const msg = error.message.toLowerCase();
  return (
    msg.includes('429') ||
    msg.includes('rate limit') ||
    msg.includes('500') ||
    msg.includes('503') ||
    msg.includes('overloaded') ||
    msg.includes('timeout') ||
    msg.includes('econnreset') ||
    msg.includes('socket hang up')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

let instance: GeminiService | null = null;

export function getGeminiService(): GeminiService {
  if (!instance) {
    instance = new GeminiService();
  }
  return instance;
}
