/**
 * validation/layers/FaceMatch.ts
 *
 * Layer 4: Gemini Vision compares the Aadhaar photo against a live selfie
 * and returns a match confidence score.
 */

import { getGeminiVisionService } from '../../services/geminiVision.service';
import type { LayerResult } from '../../schemas';

const FACE_MATCH_THRESHOLD = 70; // minimum confidence to pass

export interface FaceMatchInput {
  aadhaarImageBase64: string;
  selfieBase64: string;
  mimeType?: string;
}

/**
 * Compares the face in the Aadhaar photo with the live selfie.
 * Passes if confidence >= threshold.
 */
export async function runFaceMatch(input: FaceMatchInput): Promise<LayerResult> {
  const issues: string[] = [];
  const vision = getGeminiVisionService();
  const mimeType = input.mimeType ?? 'image/jpeg';

  try {
    const result = await vision.compareFaces(
      input.aadhaarImageBase64,
      input.selfieBase64,
      mimeType,
    );

    if (!result.matched || result.confidence < FACE_MATCH_THRESHOLD) {
      issues.push(
        `Face match failed: confidence ${result.confidence}% (threshold: ${FACE_MATCH_THRESHOLD}%). ` +
        `Reason: ${result.reason}`,
      );
    }

    return {
      layer: 4,
      name: 'FaceMatch',
      passed: result.matched && result.confidence >= FACE_MATCH_THRESHOLD,
      issues,
      confidence: result.confidence,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      layer: 4,
      name: 'FaceMatch',
      passed: false,
      issues: [`Face match analysis failed: ${errMsg}`],
      confidence: 0,
    };
  }
}
