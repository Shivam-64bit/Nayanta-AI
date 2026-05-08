/**
 * agents/BaseAgent.ts
 *
 * Abstract base class for all Nayanta AI agents.
 *
 * Provides:
 *  - Typed execute() wrapper with exponential backoff retry
 *  - Firestore audit trail persistence
 *  - Payload sanitization (truncates large strings, strips base64)
 *  - Per-execution timing instrumentation
 *
 * Every concrete agent extends this class and implements:
 *  - run(input)           — core business logic
 *  - fallbackResponse()   — safe degraded response on total failure
 */

import { getFirestore } from '../config/firestore.config';
import { COLLECTIONS, AGENT } from '../config/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuditEntry {
  agentName: string;
  userId: string;
  input: unknown;
  output: unknown;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
  timestamp: string;
}

/** All agent inputs must carry a userId for audit logging. */
export interface AgentInput {
  userId: string;
}

// ---------------------------------------------------------------------------
// Abstract Base
// ---------------------------------------------------------------------------

export abstract class BaseAgent<TInput extends AgentInput, TOutput> {
  /** Unique identifier for this agent — used in logs and audit trail. */
  protected abstract readonly agentName: string;

  /** Core agent logic. Subclasses implement this. */
  abstract run(input: TInput): Promise<TOutput>;

  /**
   * Returns a safe degraded response when all retries are exhausted.
   * Subclasses must define what a "graceful failure" looks like for their domain.
   */
  abstract fallbackResponse(input: TInput): TOutput;

  /**
   * Primary entry point called by queue processors.
   * Wraps run() with retry logic, timing, and audit trail persistence.
   */
  async execute(input: TInput): Promise<TOutput> {
    const startTime = Date.now();

    try {
      const result = await this.withRetry(() => this.run(input));
      const durationMs = Date.now() - startTime;

      await this.writeAuditTrail({
        agentName: this.agentName,
        userId: input.userId,
        input: this.sanitize(input),
        output: this.sanitize(result),
        durationMs,
        success: true,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      await this.writeAuditTrail({
        agentName: this.agentName,
        userId: input.userId,
        input: this.sanitize(input),
        output: null,
        durationMs,
        success: false,
        errorMessage,
        timestamp: new Date().toISOString(),
      });

      // Re-throw so the queue processor can handle failure / dead-letter
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // Retry engine
  // -----------------------------------------------------------------------

  private async withRetry(fn: () => Promise<TOutput>): Promise<TOutput> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= AGENT.MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (attempt === AGENT.MAX_RETRIES || !this.isRetryable(lastError)) {
          break;
        }

        const delay = AGENT.BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
        console.warn(
          `[${this.agentName}] Attempt ${attempt}/${AGENT.MAX_RETRIES} failed: ${lastError.message}. Retrying in ${delay}ms…`,
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError ?? new Error(`${this.agentName} failed after ${AGENT.MAX_RETRIES} attempts.`);
  }

  /**
   * Determines if an error is transient and worth retrying.
   * Subclasses may override to add domain-specific classification.
   */
  protected isRetryable(error: Error): boolean {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('429') ||
      msg.includes('rate limit') ||
      msg.includes('500') ||
      msg.includes('503') ||
      msg.includes('timeout') ||
      msg.includes('econnreset') ||
      msg.includes('socket hang up')
    );
  }

  // -----------------------------------------------------------------------
  // Audit trail
  // -----------------------------------------------------------------------

  protected async writeAuditTrail(entry: AuditEntry): Promise<void> {
    try {
      const db = getFirestore();
      await db.collection(COLLECTIONS.AUDIT_LOGS).add(entry);
    } catch (err) {
      // Audit logging must never crash the agent pipeline
      console.error(
        `[${this.agentName}] Failed to write audit trail:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  // -----------------------------------------------------------------------
  // Payload sanitization
  // -----------------------------------------------------------------------

  /**
   * Recursively sanitizes an object for safe logging:
   *  - Truncates strings longer than the configured threshold
   *  - Replaces base64 blobs with a placeholder
   */
  private sanitize(data: unknown): unknown {
    if (data === null || data === undefined) return data;
    if (typeof data === 'string') return this.truncateString(data);
    if (typeof data !== 'object') return data;

    if (Array.isArray(data)) {
      return data.map(item => this.sanitize(item));
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      sanitized[key] = this.sanitize(value);
    }
    return sanitized;
  }

  private truncateString(value: string): string {
    if (value.length <= AGENT.LOG_TRUNCATE_LENGTH) return value;

    // Detect base64-encoded image data
    if (/^[A-Za-z0-9+/=]{500,}$/.test(value)) {
      return `[BASE64_DATA: ${value.length} chars]`;
    }

    return `${value.slice(0, AGENT.LOG_TRUNCATE_LENGTH)}… [TRUNCATED: ${value.length} chars]`;
  }
}
