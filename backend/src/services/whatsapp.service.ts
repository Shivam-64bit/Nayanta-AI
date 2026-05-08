/**
 * services/whatsapp.service.ts
 *
 * Twilio WhatsApp integration for sending templated status update messages.
 * Falls back to SMS via Exotel if WhatsApp delivery fails.
 *
 * All credentials are loaded from environment variables:
 *  - TWILIO_ACCOUNT_SID
 *  - TWILIO_AUTH_TOKEN
 *  - TWILIO_WHATSAPP_FROM  (e.g. "whatsapp:+14155238886")
 */

import Twilio from 'twilio';
import { NOTIFICATIONS } from '../config/constants';
import type { ApplicationState } from '../schemas';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NotificationPayload {
  to: string;                          // E.164 format: +91XXXXXXXXXX
  userName: string;
  applicationId: string;
  schemeName: string;
  state: ApplicationState;
  customMessage?: string;
}

export interface NotificationResult {
  channel: 'whatsapp' | 'sms' | 'none';
  success: boolean;
  messageId?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// State → Message template mapping
// ---------------------------------------------------------------------------

const STATE_MESSAGES: Record<string, (p: NotificationPayload) => string> = {
  PROFILED:         (p) => `Hi ${p.userName}, your profile has been verified for ${p.schemeName}. We'll now find eligible scholarships for you.`,
  DISCOVERED:       (p) => `Great news ${p.userName}! We found matching scholarships for you. Application ID: ${p.applicationId}.`,
  VALIDATING:       (p) => `${p.userName}, your documents for ${p.schemeName} are being verified. We'll update you shortly.`,
  DRAFTING:         (p) => `${p.userName}, we're drafting your application for ${p.schemeName}. Almost there!`,
  SUBMITTED:        (p) => `${p.userName}, your application for ${p.schemeName} (${p.applicationId}) has been submitted successfully!`,
  RECEIVED:         (p) => `Congratulations ${p.userName}! Your scholarship amount for ${p.schemeName} has been disbursed.`,
  REJECTED:         (p) => `${p.userName}, unfortunately your application for ${p.schemeName} was not accepted. We're analyzing the reason and will help you next.`,
  GRIEVANCE_FILED:  (p) => `${p.userName}, a grievance has been filed for your ${p.schemeName} application. Reference: ${p.applicationId}.`,
  RESOLVED:         (p) => `${p.userName}, your grievance for ${p.schemeName} has been resolved. Please check the portal for details.`,
  RENEWAL_DUE:      (p) => `${p.userName}, your ${p.schemeName} scholarship renewal is due. Please log in to start the renewal process.`,
};

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class WhatsAppService {
  private client: Twilio.Twilio | null = null;
  private fromNumber: string = '';

  private ensureClient(): Twilio.Twilio {
    if (this.client) return this.client;

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM;

    if (!accountSid || !authToken || !from) {
      throw new Error(
        'Twilio credentials not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM.',
      );
    }

    this.client = Twilio(accountSid, authToken);
    this.fromNumber = from;
    return this.client;
  }

  /**
   * Sends a WhatsApp notification for the given application state change.
   * Falls back to SMS if WhatsApp fails and SMS fallback is enabled.
   */
  async sendStateNotification(payload: NotificationPayload): Promise<NotificationResult> {
    if (!NOTIFICATIONS.WHATSAPP_ENABLED) {
      console.log(`[WhatsApp] Notifications disabled. Skipping message for ${payload.applicationId}.`);
      return { channel: 'none', success: false, error: 'WhatsApp notifications disabled' };
    }

    const messageBody = this.buildMessage(payload);

    // Attempt WhatsApp delivery
    try {
      const client = this.ensureClient();
      const message = await client.messages.create({
        body: messageBody,
        from: this.fromNumber,
        to: `whatsapp:${payload.to}`,
      });

      console.log(`[WhatsApp] Sent to ${payload.to}: SID ${message.sid}`);
      return { channel: 'whatsapp', success: true, messageId: message.sid };
    } catch (whatsappError) {
      const errMsg = whatsappError instanceof Error ? whatsappError.message : String(whatsappError);
      console.error(`[WhatsApp] Delivery failed for ${payload.to}: ${errMsg}`);

      // Attempt SMS fallback via Exotel
      if (NOTIFICATIONS.SMS_FALLBACK_ENABLED) {
        return this.sendSmsFallback(payload, messageBody);
      }

      return { channel: 'whatsapp', success: false, error: errMsg };
    }
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private buildMessage(payload: NotificationPayload): string {
    if (payload.customMessage) return payload.customMessage;

    const templateFn = STATE_MESSAGES[payload.state];
    if (templateFn) return templateFn(payload);

    return `Hi ${payload.userName}, your application ${payload.applicationId} for ${payload.schemeName} has been updated to: ${payload.state}.`;
  }

  private async sendSmsFallback(
    payload: NotificationPayload,
    messageBody: string,
  ): Promise<NotificationResult> {
    try {
      // Delegate to exotel service
      const { getExotelService } = await import('./exotel.service');
      const exotel = getExotelService();
      const result = await exotel.sendSms(payload.to, messageBody);

      return {
        channel: 'sms',
        success: result.success,
        messageId: result.callId,
        error: result.error,
      };
    } catch (smsError) {
      const errMsg = smsError instanceof Error ? smsError.message : String(smsError);
      console.error(`[WhatsApp] SMS fallback also failed for ${payload.to}: ${errMsg}`);
      return { channel: 'sms', success: false, error: errMsg };
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

let instance: WhatsAppService | null = null;

export function getWhatsAppService(): WhatsAppService {
  if (!instance) {
    instance = new WhatsAppService();
  }
  return instance;
}
