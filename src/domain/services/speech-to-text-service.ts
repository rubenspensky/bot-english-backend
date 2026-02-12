export interface SpeechToTextService {
  transcribe(params: { audio: Buffer; mimeType: string }): Promise<string>;
}
