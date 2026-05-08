/**
 * services/exotel.service.ts
 *
 * Exotel API integration for:
 *  - Scheduling follow-up voice calls with CSC officers
 *  - SMS delivery (used as fallback when WhatsApp fails)
 *
 * Credentials from environment:
 *  - EXOTEL_API_KEY
 *  - EXOTEL_API_TOKEN
 *  - EXOTEL_SID           (subdomain / account SID)
 *  - EXOTEL_CALLER_ID     (virtual number)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CallScheduleResult {
  success: boolean;
  callId?: string;
  scheduledTime?: string;
  error?: string;
}

export interface SmsResult {
  success: boolean;
  callId?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class ExotelService {
  private getConfig() {
    const apiKey = process.env.EXOTEL_API_KEY;
    const apiToken = process.env.EXOTEL_API_TOKEN;
    const sid = process.env.EXOTEL_SID;
    const callerId = process.env.EXOTEL_CALLER_ID;

    if (!apiKey || !apiToken || !sid || !callerId) {
      throw new Error(
        'Exotel credentials not configured. Set EXOTEL_API_KEY, EXOTEL_API_TOKEN, EXOTEL_SID, EXOTEL_CALLER_ID.',
      );
    }

    return { apiKey, apiToken, sid, callerId };
  }

  /**
   * Schedules a follow-up voice call between the student and a CSC officer.
   * @param to       - Student's phone in E.164 format (+91XXXXXXXXXX)
   * @param cscPhone - CSC officer's phone in E.164 format
   */
  async scheduleCall(to: string, cscPhone: string): Promise<CallScheduleResult> {
    const config = this.getConfig();
    const baseUrl = `https://api.exotel.com/v1/Accounts/${config.sid}/Calls/connect.json`;

    try {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${config.apiKey}:${config.apiToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: to,
          To: cscPhone,
          CallerId: config.callerId,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Exotel API ${response.status}: ${body}`);
      }

      const data = await response.json() as { Call?: { Sid?: string } };
      const callSid = data?.Call?.Sid;
      const scheduledTime = new Date().toISOString();

      console.log(`[Exotel] Call scheduled: ${callSid} to ${to}`);
      return { success: true, callId: callSid, scheduledTime };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[Exotel] Failed to schedule call to ${to}: ${errMsg}`);
      return { success: false, error: errMsg };
    }
  }

  /**
   * Sends an SMS via Exotel (used as WhatsApp fallback).
   */
  async sendSms(to: string, body: string): Promise<SmsResult> {
    const config = this.getConfig();
    const baseUrl = `https://api.exotel.com/v1/Accounts/${config.sid}/Sms/send.json`;

    try {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${config.apiKey}:${config.apiToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: config.callerId,
          To: to,
          Body: body,
        }),
      });

      if (!response.ok) {
        const respBody = await response.text();
        throw new Error(`Exotel SMS API ${response.status}: ${respBody}`);
      }

      const data = await response.json() as { SMSMessage?: { Sid?: string } };
      const smsSid = data?.SMSMessage?.Sid;

      console.log(`[Exotel] SMS sent to ${to}: SID ${smsSid}`);
      return { success: true, callId: smsSid };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[Exotel] SMS failed to ${to}: ${errMsg}`);
      return { success: false, error: errMsg };
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

let instance: ExotelService | null = null;

export function getExotelService(): ExotelService {
  if (!instance) {
    instance = new ExotelService();
  }
  return instance;
}
