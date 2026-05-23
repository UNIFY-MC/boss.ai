// Twilio REST client for click-to-call.
//
// The universal "click → ring → talk → hang up → brain learns"
// path. We use Twilio's Node SDK for the REST calls (creating bridge calls,
// verifying caller IDs, fetching recordings) and serve our own TwiML.

import Twilio from 'twilio';
import { env } from '../lib/env';

let _client: Twilio.Twilio | null = null;

export function isTwilioConfigured(): boolean {
  return Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM_NUMBER);
}

export function twilio(): Twilio.Twilio {
  if (!isTwilioConfigured()) {
    throw new Error('Twilio not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER required)');
  }
  if (!_client) _client = Twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  return _client;
}

export interface InitiateBridgeArgs {
  operator_cell: string; // +E.164
  lead_phone: string;    // +E.164
  caller_id: string;     // verified +E.164 caller ID to show on lead's screen
}

export interface InitiateBridgeResult {
  call_sid: string;
}

/**
 * Initiate the bridge call: Twilio calls operator's cell, when they answer it
 * dials the lead and bridges + records. We host the TwiML at /twiml/dial.
 */
export async function initiateBridge(args: InitiateBridgeArgs): Promise<InitiateBridgeResult> {
  const base = env.TWILIO_WEBHOOK_BASE.replace(/\/$/, '');
  const twimlUrl =
    `${base}/twiml/dial?to=${encodeURIComponent(args.lead_phone)}` +
    `&caller_id=${encodeURIComponent(args.caller_id)}`;
  const statusCallback = `${base}/twilio/call-status`;

  const call = await twilio().calls.create({
    to: args.operator_cell,
    from: env.TWILIO_FROM_NUMBER,
    url: twimlUrl,
    method: 'POST',
    statusCallback,
    statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    statusCallbackMethod: 'POST',
  });

  return { call_sid: call.sid };
}

/**
 * Start the verified-caller-ID flow for a new operator cell.
 * Twilio places an automated call to the cell, speaks a code, and the user
 * enters it via DTMF on that same call. We poll /caller-id/verify/status to
 * track verification completion (handled by webhook in production).
 */
export async function startCallerIdVerification(phone_e164: string, displayName?: string) {
  const validation = await twilio().validationRequests.create({
    phoneNumber: phone_e164,
    friendlyName: displayName ?? phone_e164,
  });
  return {
    validation_code: validation.validationCode,
    sid: validation.callSid,
    phone: phone_e164,
  };
}

export async function listVerifiedCallerIds(): Promise<string[]> {
  if (!isTwilioConfigured()) return [];
  const ids = await twilio().outgoingCallerIds.list({ limit: 200 });
  return ids.map((i) => i.phoneNumber);
}

/**
 * Download a Twilio recording as a Buffer. The recording URL Twilio sends in
 * webhooks is the audio asset path — append .mp3 for the audio file.
 */
export async function fetchRecording(recordingUrl: string): Promise<Buffer> {
  if (!isTwilioConfigured()) throw new Error('Twilio not configured');
  // Twilio recording URLs need HTTP Basic auth (account SID + auth token)
  // and a format suffix
  const url = recordingUrl.endsWith('.mp3') ? recordingUrl : `${recordingUrl}.mp3`;
  const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');
  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
  if (!res.ok) throw new Error(`Twilio recording fetch ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
}
