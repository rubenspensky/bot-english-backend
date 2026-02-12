import 'dotenv/config';
import { CreateSessionUseCase } from './application/use-cases/create-session.js';
import { GetCurrentPromptUseCase } from './application/use-cases/get-current-prompt.js';
import { GetSessionResultUseCase } from './application/use-cases/get-session-result.js';
import { SubmitAnswerUseCase } from './application/use-cases/submit-answer.js';
import { createOpenAIClient, verifyOpenAIAuth } from './infrastructure/openai/openai-client.js';
import { OpenAIInterviewCoachService } from './infrastructure/openai/openai-interview-coach-service.js';
import { OpenAISpeechToTextService } from './infrastructure/openai/openai-speech-to-text-service.js';
import { InMemorySessionRepository } from './infrastructure/repositories/in-memory-session-repository.js';
import { buildServer } from './presentation/http/server.js';

const PORT = Number(process.env.BACKEND_PORT || 3000);
const HOST = process.env.BACKEND_HOST || '0.0.0.0';

async function start() {
  const sessionRepository = new InMemorySessionRepository();
  const openAIClient = createOpenAIClient();
  await verifyOpenAIAuth(openAIClient);
  const interviewCoachService = new OpenAIInterviewCoachService(openAIClient);
  const speechToTextService = new OpenAISpeechToTextService(openAIClient);

  const app = await buildServer({
    createSession: new CreateSessionUseCase(sessionRepository),
    getCurrentPrompt: new GetCurrentPromptUseCase(sessionRepository),
    submitAnswer: new SubmitAnswerUseCase(sessionRepository, speechToTextService, interviewCoachService),
    getSessionResult: new GetSessionResultUseCase(sessionRepository)
  });

  await app.listen({ host: HOST, port: PORT });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
