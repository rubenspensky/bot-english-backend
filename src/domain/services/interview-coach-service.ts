import type { InterviewFeedback, TimingSummary } from '../entities/session.js';

export interface InterviewerReply {
  replyText: string;
  followUpQuestion: string | null;
}

export interface TranscriptTurn {
  questionNumber: number;
  question: string;
  answer: string;
  followUpQuestion: string | null;
  followUpAnswer: string | null;
}

export interface InterviewCoachService {
  generateInterviewerReply(params: { question: string; answer: string }): Promise<InterviewerReply>;
  generateFollowUpClose(params: {
    question: string;
    answer: string;
    followUpQuestion: string;
    followUpAnswer: string;
  }): Promise<string>;
  generateFeedback(params: {
    timingSummary: TimingSummary;
    transcript: TranscriptTurn[];
  }): Promise<InterviewFeedback>;
}
