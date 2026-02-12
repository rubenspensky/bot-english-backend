import type { InterviewSession, InterviewFeedback } from '../../domain/entities/session.js';
import type { SessionRepository } from '../../domain/repositories/session-repository.js';
import type { InterviewCoachService } from '../../domain/services/interview-coach-service.js';
import type { SpeechToTextService } from '../../domain/services/speech-to-text-service.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { ValidationError } from '../errors/validation-error.js';
import { computeTimingSummary } from './helpers.js';

export interface SubmitAnswerInput {
  sessionId: string;
  answerText?: string;
  audioBase64?: string;
  mimeType?: string;
  responseDelaySec?: number;
}

export interface SubmitAnswerResult {
  sessionId: string;
  status: 'in_progress' | 'completed';
  usedTranscript: string;
  interviewerMessage: string;
  nextPrompt: string | null;
  promptType: 'question' | 'follow_up' | 'completed';
  result: InterviewFeedback | null;
}

export class SubmitAnswerUseCase {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly speechToTextService: SpeechToTextService,
    private readonly interviewCoachService: InterviewCoachService
  ) {}

  async execute(input: SubmitAnswerInput): Promise<SubmitAnswerResult> {
    const session = await this.sessionRepository.findById(input.sessionId);
    if (!session) {
      throw new NotFoundError('Session not found.');
    }

    if (session.status === 'completed') {
      throw new ValidationError('Session is already completed.');
    }

    const responseDelaySec = normalizeDelay(input.responseDelaySec);
    const transcript = await this.resolveTranscript(input);

    if (session.awaitingFollowUp) {
      return this.submitFollowUpAnswer({ session, transcript, responseDelaySec });
    }

    return this.submitMainAnswer({ session, transcript, responseDelaySec });
  }

  private async submitMainAnswer(params: {
    session: InterviewSession;
    transcript: string;
    responseDelaySec: number;
  }): Promise<SubmitAnswerResult> {
    const { session, transcript, responseDelaySec } = params;
    const question = session.questions[session.questionIndex];
    if (!question) {
      throw new ValidationError('No active question found for this session.');
    }

    const interviewerReply = await this.interviewCoachService.generateInterviewerReply({
      question,
      answer: transcript
    });
    const followUpQuestion = session.allowFollowUps ? interviewerReply.followUpQuestion : null;

    session.turns.push({
      question,
      answer: transcript,
      followUpQuestion,
      followUpAnswer: null,
      mainResponseDelaySec: responseDelaySec,
      followUpResponseDelaySec: null
    });

    if (followUpQuestion) {
      session.awaitingFollowUp = true;
      session.pendingFollowUpQuestion = followUpQuestion;

      await this.sessionRepository.save(session);

      return {
        sessionId: session.id,
        status: session.status,
        usedTranscript: transcript,
        interviewerMessage: interviewerReply.replyText,
        nextPrompt: followUpQuestion,
        promptType: 'follow_up',
        result: null
      };
    }

    session.questionIndex += 1;
    const completion = await this.completeIfFinished(session);
    await this.sessionRepository.save(session);

    return {
      sessionId: session.id,
      status: session.status,
      usedTranscript: transcript,
      interviewerMessage: interviewerReply.replyText,
      nextPrompt: session.status === 'completed' ? null : session.questions[session.questionIndex],
      promptType: session.status === 'completed' ? 'completed' : 'question',
      result: completion
    };
  }

  private async submitFollowUpAnswer(params: {
    session: InterviewSession;
    transcript: string;
    responseDelaySec: number;
  }): Promise<SubmitAnswerResult> {
    const { session, transcript, responseDelaySec } = params;
    const activeTurn = session.turns[session.turns.length - 1];

    if (!activeTurn?.followUpQuestion) {
      throw new ValidationError('Follow-up is not available for this session state.');
    }

    activeTurn.followUpAnswer = transcript;
    activeTurn.followUpResponseDelaySec = responseDelaySec;

    const closeText = await this.interviewCoachService.generateFollowUpClose({
      question: activeTurn.question,
      answer: activeTurn.answer,
      followUpQuestion: activeTurn.followUpQuestion,
      followUpAnswer: transcript
    });

    session.awaitingFollowUp = false;
    session.pendingFollowUpQuestion = null;
    session.questionIndex += 1;

    const completion = await this.completeIfFinished(session);
    await this.sessionRepository.save(session);

    return {
      sessionId: session.id,
      status: session.status,
      usedTranscript: transcript,
      interviewerMessage: closeText,
      nextPrompt: session.status === 'completed' ? null : session.questions[session.questionIndex],
      promptType: session.status === 'completed' ? 'completed' : 'question',
      result: completion
    };
  }

  private async resolveTranscript(input: SubmitAnswerInput): Promise<string> {
    if (input.answerText && input.answerText.trim()) {
      return input.answerText.trim();
    }

    if (!input.audioBase64) {
      throw new ValidationError('Provide either answerText or audioBase64.');
    }

    const mimeType = input.mimeType?.trim() || 'audio/wav';

    let audio: Buffer;
    try {
      audio = Buffer.from(input.audioBase64, 'base64');
    } catch {
      throw new ValidationError('audioBase64 must be a valid base64 string.');
    }

    if (!audio.length) {
      throw new ValidationError('Decoded audio payload is empty.');
    }

    const transcript = await this.speechToTextService.transcribe({ audio, mimeType });
    if (!transcript.trim()) {
      throw new ValidationError('Transcription returned empty text.');
    }

    return transcript.trim();
  }

  private async completeIfFinished(session: InterviewSession): Promise<InterviewFeedback | null> {
    if (session.questionIndex < session.questions.length) {
      return null;
    }

    const timingSummary = computeTimingSummary(session.turns);
    const transcript = session.turns.map((turn, index) => ({
      questionNumber: index + 1,
      question: turn.question,
      answer: turn.answer,
      followUpQuestion: turn.followUpQuestion,
      followUpAnswer: turn.followUpAnswer
    }));

    const feedback = await this.interviewCoachService.generateFeedback({ timingSummary, transcript });

    session.result = {
      timingSummary,
      corrections: feedback.corrections,
      improvedBestAnswer: feedback.improvedBestAnswer,
      interviewTips: feedback.interviewTips
    };
    session.status = 'completed';

    return session.result;
  }
}

function normalizeDelay(value: number | undefined): number {
  if (value === undefined) {
    return 0;
  }
  if (!Number.isFinite(value) || value < 0) {
    throw new ValidationError('responseDelaySec must be a non-negative number.');
  }
  return Number(value.toFixed(2));
}
