import type OpenAI from 'openai';
import type { TextToSpeechService } from '../../domain/services/text-to-speech-service.js';
import { TTS_MODEL, TTS_VOICE } from './config.js';

export class OpenAITextToSpeechService implements TextToSpeechService {
  constructor(private readonly client: OpenAI) {}

  async synthesize(params: { text: string }): Promise<Buffer> {
    const response = await this.client.audio.speech.create({
      model: TTS_MODEL,
      voice: TTS_VOICE as 'nova',
      input: params.text,
      response_format: 'mp3'
    });

    return Buffer.from(await response.arrayBuffer());
  }
}
