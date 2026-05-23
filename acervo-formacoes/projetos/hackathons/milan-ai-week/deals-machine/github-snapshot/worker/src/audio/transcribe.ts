// Audio transcription dispatcher.
// Tries Speechmatics first (sponsor track), falls back to OpenAI Whisper.
//
// Two entry points:
//   transcribeAudio(url)   — provider fetches the URL itself (works for public URLs)
//   transcribeBuffer(buf)  — caller pre-downloaded the audio (use for Twilio
//                            recordings which require HTTP Basic auth)
//
// Returns { text, provider } so we can persist which path delivered the
// transcription on the transcripts row.

import { env } from '../lib/env';
import { transcribeWithSpeechmatics, transcribeBufferWithSpeechmatics } from './speechmatics';
import { transcribeWithWhisper, transcribeBufferWithWhisper } from './whisper';

export type AudioProvider = 'speechmatics' | 'whisper';

export async function transcribeAudio(audioUrl: string): Promise<{ text: string; provider: AudioProvider }> {
  if (env.SPEECHMATICS_API_KEY) {
    try {
      const text = await transcribeWithSpeechmatics(audioUrl);
      return { text, provider: 'speechmatics' };
    } catch (err) {
      console.error('[transcribe] speechmatics failed, falling back to whisper:', err);
    }
  }
  if (env.OPENAI_API_KEY) {
    const text = await transcribeWithWhisper(audioUrl);
    return { text, provider: 'whisper' };
  }
  throw new Error('No transcription provider configured (set SPEECHMATICS_API_KEY or OPENAI_API_KEY)');
}

export async function transcribeBuffer(
  buffer: Buffer,
  format: 'mp3' | 'wav' | 'm4a' = 'mp3'
): Promise<{ text: string; provider: AudioProvider }> {
  let speechmaticsError: Error | null = null;
  if (env.SPEECHMATICS_API_KEY) {
    try {
      const text = await transcribeBufferWithSpeechmatics(buffer, format);
      return { text, provider: 'speechmatics' };
    } catch (err) {
      speechmaticsError = err as Error;
      console.error('[transcribe] speechmatics failed on buffer, falling back to whisper:', err);
    }
  }
  if (env.OPENAI_API_KEY) {
    const text = await transcribeBufferWithWhisper(buffer, format);
    return { text, provider: 'whisper' };
  }
  if (speechmaticsError) {
    throw new Error(`Speechmatics failed and no Whisper fallback: ${speechmaticsError.message}`);
  }
  throw new Error('No transcription provider configured (set SPEECHMATICS_API_KEY or OPENAI_API_KEY)');
}
