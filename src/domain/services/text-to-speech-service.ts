export interface TextToSpeechService {
  synthesize(params: { text: string }): Promise<Buffer>;
}
