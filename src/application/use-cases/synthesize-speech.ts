import { ValidationError } from '../errors/validation-error.js';
import type { TextToSpeechService } from '../../domain/services/text-to-speech-service.js';

export class SynthesizeSpeechUseCase {
  constructor(private readonly ttsService: TextToSpeechService) {}

  async execute(input: { text: string }): Promise<{ audio: Buffer; mimeType: string }> {
    if (!input.text || !input.text.trim()) {
      throw new ValidationError('Text must not be empty.');
    }

    const audio = await this.ttsService.synthesize({ text: input.text });
    return { audio, mimeType: 'audio/mpeg' };
  }
}
