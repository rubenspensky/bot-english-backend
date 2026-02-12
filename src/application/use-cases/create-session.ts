import { randomUUID } from 'node:crypto';
import { QUESTION_BANK } from '../../domain/entities/question-bank.js';
import type { InterviewSession } from '../../domain/entities/session.js';
import type { SessionRepository } from '../../domain/repositories/session-repository.js';

export class CreateSessionUseCase {
  constructor(private readonly sessionRepository: SessionRepository) {}

  async execute(input: { questionCount?: number; allowFollowUps?: boolean }): Promise<InterviewSession> {
    const requestedCount = input.questionCount ?? 3;
    const questionCount = Math.max(1, Math.min(requestedCount, QUESTION_BANK.length));
    const allowFollowUps = input.allowFollowUps ?? true;

    const session: InterviewSession = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      status: 'in_progress',
      allowFollowUps,
      questions: QUESTION_BANK.slice(0, questionCount),
      questionIndex: 0,
      awaitingFollowUp: false,
      pendingFollowUpQuestion: null,
      turns: [],
      result: null
    };

    await this.sessionRepository.create(session);
    return session;
  }
}
