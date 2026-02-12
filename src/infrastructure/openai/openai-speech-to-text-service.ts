import { toFile } from 'openai/uploads';
import type OpenAI from 'openai';
import type { SpeechToTextService } from '../../domain/services/speech-to-text-service.js';
import { STT_MODEL } from './config.js';

export class OpenAISpeechToTextService implements SpeechToTextService {
  constructor(private readonly client: OpenAI) {}

  async transcribe(params: { audio: Buffer; mimeType: string }): Promise<string> {
    const file = await toFile(params.audio, `answer.${extensionFromMimeType(params.mimeType)}`, {
      type: params.mimeType
    });

    const transcript = await this.client.audio.transcriptions.create({
      model: STT_MODEL,
      file
    });

    const text = extractTranscriptText(transcript);
    if (!text) {
      throw new Error('empty transcription from STT');
    }

    return text;
  }
}

function extractTranscriptText(transcript: unknown): string {
  if (!transcript || typeof transcript !== 'object') {
    return '';
  }

  const maybeText = (transcript as { text?: string }).text;
  if (typeof maybeText === 'string' && maybeText.trim()) {
    return maybeText.trim();
  }

  const segments = (transcript as { segments?: Array<{ text?: string }> }).segments;
  if (Array.isArray(segments)) {
    const joined = segments
      .map((segment) => (segment && typeof segment.text === 'string' ? segment.text.trim() : ''))
      .filter(Boolean)
      .join(' ')
      .trim();

    if (joined) {
      return joined;
    }
  }

  return '';
}

function extensionFromMimeType(mimeType: string): string {
  switch (mimeType) {
    case 'audio/wav':
    case 'audio/x-wav':
      return 'wav';
    case 'audio/mpeg':
      return 'mp3';
    case 'audio/webm':
      return 'webm';
    default:
      return 'wav';
  }
}
