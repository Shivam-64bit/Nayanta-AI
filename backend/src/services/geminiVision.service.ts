/**
 * services/geminiVision.service.ts
 *
 * Wraps Gemini Vision API for document analysis:
 *  - OCR text extraction from document images
 *  - Face matching between Aadhaar photo and live selfie
 *  - QR/barcode data extraction and validation
 *
 * Accepts base64-encoded images. Returns structured, Zod-validated output.
 */

import {
  GoogleGenerativeAI,
  type GenerativeModel,
  type Part,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';
import { z } from 'zod';
import { GEMINI } from '../config/constants';

// ---------------------------------------------------------------------------
// Output Schemas (internal Zod contracts for Gemini responses)
// ---------------------------------------------------------------------------

const OcrResponseSchema = z.object({
  extractedText: z.string(),
  fields: z.record(z.string(), z.string()),
  confidence: z.number().min(0).max(100),
});
export type OcrResult = z.infer<typeof OcrResponseSchema>;

const FaceMatchResponseSchema = z.object({
  matched: z.boolean(),
  confidence: z.number().min(0).max(100),
  reason: z.string(),
});
export type FaceMatchResult = z.infer<typeof FaceMatchResponseSchema>;

const QrBarcodeResponseSchema = z.object({
  found: z.boolean(),
  decodedData: z.string().nullable(),
  matchesPrintedText: z.boolean(),
  confidence: z.number().min(0).max(100),
});
export type QrBarcodeResult = z.infer<typeof QrBarcodeResponseSchema>;

// ---------------------------------------------------------------------------
// Safety settings
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

class GeminiVisionService {
  private readonly client: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set.');
    }
    this.client = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Extracts structured fields from a document image via OCR.
   * @param imageBase64 - base64-encoded image data (no data URI prefix)
   * @param mimeType    - e.g. 'image/jpeg', 'image/png'
   * @param documentType - e.g. 'aadhaar', 'income_certificate', 'marksheet'
   */
  async extractDocumentFields(
    imageBase64: string,
    mimeType: string,
    documentType: string,
  ): Promise<OcrResult> {
    const prompt = [
      `You are an expert Indian government document OCR system.`,
      `Analyze this ${documentType} document image and extract all visible fields.`,
      `Return a JSON object with:`,
      `- "extractedText": the full raw text visible in the document`,
      `- "fields": a key-value object of all structured fields you can identify`,
      `  (e.g. "name", "dob", "address", "fatherName", "income", "issueDate", "documentNumber", "issuingAuthority")`,
      `- "confidence": your confidence score 0–100 in the extraction accuracy`,
      `Only return valid JSON, no markdown.`,
    ].join('\n');

    const imagePart = this.buildImagePart(imageBase64, mimeType);
    return this.callVisionStructured(prompt, [imagePart], OcrResponseSchema);
  }

  /**
   * Compares an Aadhaar photo against a live selfie for face matching.
   */
  async compareFaces(
    aadhaarImageBase64: string,
    selfieBase64: string,
    mimeType = 'image/jpeg',
  ): Promise<FaceMatchResult> {
    const prompt = [
      `You are a face verification system.`,
      `Compare the face in Image 1 (government ID photo) with Image 2 (live selfie).`,
      `Determine if they are the same person.`,
      `Return a JSON object with:`,
      `- "matched": boolean indicating if the faces match`,
      `- "confidence": your confidence score 0–100`,
      `- "reason": brief explanation of your determination`,
      `Only return valid JSON, no markdown.`,
    ].join('\n');

    const parts: Part[] = [
      this.buildImagePart(aadhaarImageBase64, mimeType),
      this.buildImagePart(selfieBase64, mimeType),
    ];

    return this.callVisionStructured(prompt, parts, FaceMatchResponseSchema);
  }

  /**
   * Extracts QR/barcode data from a document image and validates against printed text.
   */
  async extractQrBarcode(
    imageBase64: string,
    mimeType: string,
  ): Promise<QrBarcodeResult> {
    const prompt = [
      `Analyze this document image for any QR codes or barcodes.`,
      `If found, decode the data and compare it against the printed text in the document.`,
      `Return a JSON object with:`,
      `- "found": boolean indicating if a QR code or barcode was found`,
      `- "decodedData": the decoded string data, or null if not found`,
      `- "matchesPrintedText": boolean indicating if decoded data matches the printed document fields`,
      `- "confidence": your confidence score 0–100`,
      `Only return valid JSON, no markdown.`,
    ].join('\n');

    const imagePart = this.buildImagePart(imageBase64, mimeType);
    return this.callVisionStructured(prompt, [imagePart], QrBarcodeResponseSchema);
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  private buildImagePart(base64Data: string, mimeType: string): Part {
    return {
      inlineData: {
        mimeType,
        data: base64Data,
      },
    };
  }

  private async callVisionStructured<T>(
    prompt: string,
    imageParts: Part[],
    schema: z.ZodType<T>,
  ): Promise<T> {
    const model = this.buildModel();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= GEMINI.MAX_RETRIES; attempt++) {
      try {
        const result = await model.generateContent([prompt, ...imageParts]);
        const text = result.response.text();

        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          throw new Error(`Gemini Vision returned non-JSON: ${text.slice(0, 200)}`);
        }

        const validated = schema.safeParse(parsed);
        if (!validated.success) {
          throw new Error(
            `Vision response failed schema validation: ${validated.error.issues.map(i => i.message).join('; ')}`,
          );
        }
        return validated.data;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (!this.isRetryable(lastError) || attempt === GEMINI.MAX_RETRIES) {
          break;
        }

        const delay = GEMINI.RETRY_BASE_MS * Math.pow(2, attempt - 1);
        console.warn(
          `[GeminiVision] Attempt ${attempt}/${GEMINI.MAX_RETRIES} failed: ${lastError.message}. Retrying in ${delay}ms…`,
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError ?? new Error('Gemini Vision call failed after all retries.');
  }

  private buildModel(): GenerativeModel {
    return this.client.getGenerativeModel({
      model: GEMINI.VISION_MODEL,
      generationConfig: {
        temperature: GEMINI.TEMPERATURE,
        maxOutputTokens: GEMINI.MAX_OUTPUT_TOKENS,
        responseMimeType: 'application/json',
      },
      safetySettings: SAFETY_SETTINGS,
    });
  }

  private isRetryable(error: Error): boolean {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('429') ||
      msg.includes('rate limit') ||
      msg.includes('500') ||
      msg.includes('503') ||
      msg.includes('timeout') ||
      msg.includes('econnreset')
    );
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

let instance: GeminiVisionService | null = null;

export function getGeminiVisionService(): GeminiVisionService {
  if (!instance) {
    instance = new GeminiVisionService();
  }
  return instance;
}
