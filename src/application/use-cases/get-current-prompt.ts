import type { SessionRepository } from '../../domain/repositories/session-repository.js';
import { NotFoundError } from '../errors/not-found-error.js';

export interface CurrentPromptResult {
  sessionId: string;
  status: 'in_progress' | 'completed';
  prompt: string | null;
  promptType: 'question' | 'follow_up' | 'completed';
  questionNumber: number;
  totalQuestions: number;
}

export class GetCurrentPromptUseCase {
  constructor(private readonly sessionRepository: SessionRepository) {}

  async execute(input: { sessionId: string }): Promise<CurrentPromptResult> {
    const session = await this.sessionRepository.findById(input.sessionId);
    if (!session) {
      throw new NotFoundError('Session not found.');
    }

    if (session.status === 'completed') {
      return {
        sessionId: session.id,
        status: session.status,
        prompt: null,
        promptType: 'completed',
        questionNumber: session.questions.length,
        totalQuestions: session.questions.length
      };
    }

    if (session.awaitingFollowUp && session.pendingFollowUpQuestion) {
      return {
        sessionId: session.id,
        status: session.status,
        prompt: session.pendingFollowUpQuestion,
        promptType: 'follow_up',
        questionNumber: session.questionIndex + 1,
        totalQuestions: session.questions.length
      };
    }

    return {
      sessionId: session.id,
      status: session.status,
      prompt: session.questions[session.questionIndex],
      promptType: 'question',
      questionNumber: session.questionIndex + 1,
      totalQuestions: session.questions.length
    };
  }
}
