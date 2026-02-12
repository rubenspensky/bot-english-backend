import type { InterviewSession } from '../entities/session.js';

export interface SessionRepository {
  create(session: InterviewSession): Promise<void>;
  findById(sessionId: string): Promise<InterviewSession | null>;
  save(session: InterviewSession): Promise<void>;
}
