import fs from 'node:fs/promises';
import path from 'node:path';
import { CreateSessionUseCase } from '../src/application/use-cases/create-session.js';
import { GetCurrentPromptUseCase } from '../src/application/use-cases/get-current-prompt.js';
import { GetSessionResultUseCase } from '../src/application/use-cases/get-session-result.js';
import { SubmitAnswerUseCase } from '../src/application/use-cases/submit-answer.js';
import type { InterviewCoachService } from '../src/domain/services/interview-coach-service.js';
import type { SpeechToTextService } from '../src/domain/services/speech-to-text-service.js';
import { InMemorySessionRepository } from '../src/infrastructure/repositories/in-memory-session-repository.js';
import { buildServer } from '../src/presentation/http/server.js';

const OUTPUT_PATH = path.resolve(process.cwd(), 'openapi.json');

const fakeSpeechToText: SpeechToTextService = {
  async transcribe() {
    return 'stub';
  }
};

const fakeInterviewCoach: InterviewCoachService = {
  async generateInterviewerReply() {
    return { replyText: 'stub', followUpQuestion: null };
  },
  async generateFollowUpClose() {
    return 'stub';
  },
  async generateFeedback(params) {
    return {
      timingSummary: params.timingSummary,
      corrections: [],
      improvedBestAnswer: { question: '', answer: '' },
      interviewTips: []
    };
  }
};

async function main() {
  const repo = new InMemorySessionRepository();

  const app = await buildServer({
    createSession: new CreateSessionUseCase(repo),
    getCurrentPrompt: new GetCurrentPromptUseCase(repo),
    submitAnswer: new SubmitAnswerUseCase(repo, fakeSpeechToText, fakeInterviewCoach),
    getSessionResult: new GetSessionResultUseCase(repo)
  });

  await app.ready();
  const spec = app.swagger();
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(spec, null, 2)}\n`, 'utf8');
  await app.close();

  process.stdout.write(`OpenAPI written to ${OUTPUT_PATH}\n`);
}

main().catch((error) => {
  process.stderr.write(`${String(error)}\n`);
  process.exit(1);
});
