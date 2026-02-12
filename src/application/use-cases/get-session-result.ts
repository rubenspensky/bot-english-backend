import type { InterviewFeedback } from '../../domain/entities/session.js';
import type { SessionRepository } from '../../domain/repositories/session-repository.js';
import { NotFoundError } from '../errors/not-found-error.js';

export interface SessionResultView {
  sessionId: string;
  status: 'in_progress' | 'completed';
  result: InterviewFeedback | null;
}

export class GetSessionResultUseCase {
  constructor(private readonly sessionRepository: SessionRepository) {}

  async execute(input: { sessionId: string }): Promise<SessionResultView> {
    const session = await this.sessionRepository.findById(input.sessionId);
    if (!session) {
      throw new NotFoundError('Session not found.');
    }

    return {
      sessionId: session.id,
      status: session.status,
      result: session.result
    };
  }
}
