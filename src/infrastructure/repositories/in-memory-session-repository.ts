import type { InterviewSession } from '../../domain/entities/session.js';
import type { SessionRepository } from '../../domain/repositories/session-repository.js';

export class InMemorySessionRepository implements SessionRepository {
  private readonly sessions = new Map<string, InterviewSession>();

  async create(session: InterviewSession): Promise<void> {
    this.sessions.set(session.id, clone(session));
  }

  async findById(sessionId: string): Promise<InterviewSession | null> {
    const session = this.sessions.get(sessionId);
    return session ? clone(session) : null;
  }

  async save(session: InterviewSession): Promise<void> {
    this.sessions.set(session.id, clone(session));
  }
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
